import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MAX_TASK_IMAGES, TasksService } from './tasks.service';

type AuthUser = {
  id: string;
};

const imagesUpload = FilesInterceptor('images', MAX_TASK_IMAGES, {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List my tasks' })
  list(@CurrentUser() user: AuthUser) {
    return this.tasksService.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by id' })
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.getOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a task with optional images (max 5)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        notes: { type: 'string' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        address: { type: 'string' },
        dueAt: { type: 'string', format: 'date-time' },
        remindBeforeMinutes: { type: 'number' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['title'],
    },
  })
  @UseInterceptors(imagesUpload)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.tasksService.create(user.id, dto, images ?? []);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a task (fields and/or add/remove images)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        notes: { type: 'string' },
        done: { type: 'boolean' },
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        address: { type: 'string' },
        clearLocation: { type: 'boolean' },
        dueAt: { type: 'string', format: 'date-time' },
        remindBeforeMinutes: { type: 'number' },
        clearDueAt: { type: 'boolean' },
        clearRemindBefore: { type: 'boolean' },
        removeImageIds: {
          type: 'string',
          description: 'JSON array of image ids to remove',
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(imagesUpload)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.tasksService.update(user.id, id, dto, images ?? []);
  }

  @Delete(':id/images/:imageId')
  @ApiOperation({ summary: 'Delete one image from a task' })
  removeImage(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
  ) {
    return this.tasksService.removeImage(user.id, id, imageId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tasksService.remove(user.id, id);
  }
}
