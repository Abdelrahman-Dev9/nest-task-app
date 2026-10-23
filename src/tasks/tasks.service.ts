import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

export const MAX_TASK_IMAGES = 5;

const taskWithImages = {
  images: { orderBy: { sortOrder: 'asc' as const } },
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  list(userId: string) {
    return this.prisma.task.findMany({
      where: { userId },
      include: taskWithImages,
      orderBy: [{ done: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getOne(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: taskWithImages,
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (task.userId !== userId) {
      throw new ForbiddenException('Not allowed');
    }
    return task;
  }

  async create(
    userId: string,
    dto: CreateTaskDto,
    files: Express.Multer.File[] = [],
  ) {
    if (files.length > MAX_TASK_IMAGES) {
      throw new BadRequestException(
        `A task can have at most ${MAX_TASK_IMAGES} images`,
      );
    }

    const uploaded = await this.uploadFiles(files);

    const hasLocation =
      dto.latitude !== undefined && dto.longitude !== undefined;
    const dueAt = this.parseDueAt(dto.dueAt);
    const remindBeforeMinutes =
      dueAt && dto.remindBeforeMinutes !== undefined
        ? dto.remindBeforeMinutes
        : null;

    try {
      return await this.prisma.task.create({
        data: {
          title: dto.title.trim(),
          notes: dto.notes?.trim() || null,
          latitude: hasLocation ? dto.latitude : null,
          longitude: hasLocation ? dto.longitude : null,
          address: hasLocation ? dto.address?.trim() || null : null,
          dueAt,
          remindBeforeMinutes,
          userId,
          images: uploaded.length
            ? {
                create: uploaded.map((img, index) => ({
                  url: img.url,
                  publicId: img.publicId,
                  sortOrder: index,
                })),
              }
            : undefined,
        },
        include: taskWithImages,
      });
    } catch (error) {
      await Promise.all(
        uploaded.map((img) => this.cloudinary.deleteImage(img.publicId)),
      );
      throw error;
    }
  }

  async update(
    userId: string,
    taskId: string,
    dto: UpdateTaskDto,
    files: Express.Multer.File[] = [],
  ) {
    const task = await this.getOne(userId, taskId);
    const removeIds = this.parseRemoveImageIds(dto.removeImageIds);

    if (removeIds.length) {
      const ownedIds = new Set(task.images.map((img) => img.id));
      for (const id of removeIds) {
        if (!ownedIds.has(id)) {
          throw new BadRequestException(`Image ${id} does not belong to task`);
        }
      }
    }

    const remainingCount = task.images.length - removeIds.length;
    if (remainingCount + files.length > MAX_TASK_IMAGES) {
      throw new BadRequestException(
        `A task can have at most ${MAX_TASK_IMAGES} images`,
      );
    }

    const uploaded = await this.uploadFiles(files);
    const imagesToDelete = task.images.filter((img) =>
      removeIds.includes(img.id),
    );

    const clearLocation = dto.clearLocation === true;
    const hasLocation =
      !clearLocation &&
      dto.latitude !== undefined &&
      dto.longitude !== undefined;

    const nextSortStart =
      task.images
        .filter((img) => !removeIds.includes(img.id))
        .reduce((max, img) => Math.max(max, img.sortOrder), -1) + 1;

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (removeIds.length) {
          await tx.taskImage.deleteMany({
            where: { taskId, id: { in: removeIds } },
          });
        }

        if (uploaded.length) {
          await tx.taskImage.createMany({
            data: uploaded.map((img, index) => ({
              taskId,
              url: img.url,
              publicId: img.publicId,
              sortOrder: nextSortStart + index,
            })),
          });
        }

        const clearDueAt = dto.clearDueAt === true;
        const clearRemindBefore = dto.clearRemindBefore === true;

        return tx.task.update({
          where: { id: taskId },
          data: {
            title: dto.title?.trim() ?? undefined,
            notes:
              dto.notes !== undefined ? dto.notes.trim() || null : undefined,
            done: dto.done,
            ...(clearLocation
              ? { latitude: null, longitude: null, address: null }
              : hasLocation
                ? {
                    latitude: dto.latitude,
                    longitude: dto.longitude,
                    address: dto.address?.trim() || null,
                  }
                : {}),
            ...(clearDueAt
              ? { dueAt: null, remindBeforeMinutes: null }
              : {
                  ...(dto.dueAt !== undefined
                    ? { dueAt: this.parseDueAt(dto.dueAt) }
                    : {}),
                  ...(clearRemindBefore
                    ? { remindBeforeMinutes: null }
                    : dto.remindBeforeMinutes !== undefined
                      ? { remindBeforeMinutes: dto.remindBeforeMinutes }
                      : {}),
                }),
          },
          include: taskWithImages,
        });
      });

      await Promise.all(
        imagesToDelete.map((img) => this.cloudinary.deleteImage(img.publicId)),
      );

      return updated;
    } catch (error) {
      await Promise.all(
        uploaded.map((img) => this.cloudinary.deleteImage(img.publicId)),
      );
      throw error;
    }
  }

  async removeImage(userId: string, taskId: string, imageId: string) {
    const task = await this.getOne(userId, taskId);
    const image = task.images.find((img) => img.id === imageId);
    if (!image) {
      throw new NotFoundException('Image not found');
    }

    await this.prisma.taskImage.delete({ where: { id: imageId } });
    await this.cloudinary.deleteImage(image.publicId);

    return this.getOne(userId, taskId);
  }

  async remove(userId: string, taskId: string) {
    const task = await this.getOne(userId, taskId);
    await Promise.all(
      task.images.map((img) => this.cloudinary.deleteImage(img.publicId)),
    );
    await this.prisma.task.delete({ where: { id: taskId } });
    return { message: 'Task deleted' };
  }

  private parseDueAt(raw?: string): Date | null {
    if (!raw?.trim()) return null;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid dueAt datetime');
    }
    return date;
  }

  private parseRemoveImageIds(raw?: string): string[] {
    if (!raw?.trim()) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((id): id is string => typeof id === 'string');
      }
    } catch {
      // fall through to comma-separated
    }
    return raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  private async uploadFiles(files: Express.Multer.File[]) {
    const uploaded: { url: string; publicId: string }[] = [];
    try {
      for (const file of files) {
        uploaded.push(await this.cloudinary.uploadImage(file, 'tasks'));
      }
      return uploaded;
    } catch (error) {
      await Promise.all(
        uploaded.map((img) => this.cloudinary.deleteImage(img.publicId)),
      );
      throw error;
    }
  }
}
