import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  list(userId: string) {
    return this.prisma.task.findMany({
      where: { userId },
      orderBy: [{ done: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getOne(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
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
    file?: Express.Multer.File,
  ) {
    let imageUrl: string | undefined;
    let imagePublicId: string | undefined;

    if (file) {
      const uploaded = await this.cloudinary.uploadImage(file, 'tasks');
      imageUrl = uploaded.url;
      imagePublicId = uploaded.publicId;
    }

    const hasLocation =
      dto.latitude !== undefined && dto.longitude !== undefined;

    return this.prisma.task.create({
      data: {
        title: dto.title.trim(),
        notes: dto.notes?.trim() || null,
        imageUrl,
        imagePublicId,
        latitude: hasLocation ? dto.latitude : null,
        longitude: hasLocation ? dto.longitude : null,
        address: hasLocation ? dto.address?.trim() || null : null,
        userId,
      },
    });
  }

  async update(
    userId: string,
    taskId: string,
    dto: UpdateTaskDto,
    file?: Express.Multer.File,
  ) {
    const task = await this.getOne(userId, taskId);

    let imageUrl = task.imageUrl;
    let imagePublicId = task.imagePublicId;

    if (file) {
      const uploaded = await this.cloudinary.uploadImage(file, 'tasks');
      await this.cloudinary.deleteImage(task.imagePublicId);
      imageUrl = uploaded.url;
      imagePublicId = uploaded.publicId;
    }

    const clearLocation = dto.clearLocation === true;
    const hasLocation =
      !clearLocation &&
      dto.latitude !== undefined &&
      dto.longitude !== undefined;

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title?.trim() ?? undefined,
        notes: dto.notes !== undefined ? dto.notes.trim() || null : undefined,
        done: dto.done,
        imageUrl,
        imagePublicId,
        ...(clearLocation
          ? { latitude: null, longitude: null, address: null }
          : hasLocation
            ? {
                latitude: dto.latitude,
                longitude: dto.longitude,
                address: dto.address?.trim() || null,
              }
            : {}),
      },
    });
  }

  async remove(userId: string, taskId: string) {
    const task = await this.getOne(userId, taskId);
    await this.cloudinary.deleteImage(task.imagePublicId);
    await this.prisma.task.delete({ where: { id: taskId } });
    return { message: 'Task deleted' };
  }
}
