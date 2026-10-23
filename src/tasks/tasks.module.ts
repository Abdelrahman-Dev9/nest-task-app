import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
