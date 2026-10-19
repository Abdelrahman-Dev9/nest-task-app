import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkOrJwtAuthGuard } from '../auth/guards/clerk-or-jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

type AuthUser = {
  id: string;
};

const imageUpload = FileInterceptor('image', {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(ClerkOrJwtAuthGuard)
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
  @ApiOperation({ summary: 'Create a task with optional image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        notes: { type: 'string' },
        image: { type: 'string', format: 'binary' },
      },
      required: ['title'],
    },
  })
  @UseInterceptors(imageUpload)
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.tasksService.create(user.id, dto, image);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task (fields and/or image)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        notes: { type: 'string' },
        done: { type: 'boolean' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(imageUpload)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.tasksService.update(user.id, id, dto, image);
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
