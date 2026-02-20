import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards';
import { Roles, UserRole } from '../../common/decorators';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';
import { CreateTaskItemDto, UpdateTaskItemDto } from './dto/task-item.dto';
import { CreateTaskCommentDto } from './dto/task-comment.dto';
import {
  CreateTaskComponentDto,
  CreateTaskPhotoDto,
  AssignTaskDto,
  PostponeTaskDto,
  RejectTaskDto,
} from './dto/task-component.dto';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ============================================================================
  // STATIC ROUTES (must come before :id)
  // ============================================================================

  @Get('kanban')
  @ApiOperation({ summary: 'Get kanban board - tasks grouped by status' })
  @ApiQuery({ name: 'assigneeId', required: false, description: 'Filter by assignee ID' })
  @ApiQuery({ name: 'machineId', required: false, description: 'Filter by machine ID' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by task type' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority' })
  @ApiResponse({ status: 200, description: 'Kanban board with tasks grouped by status' })
  getKanbanBoard(
    @CurrentUser() user: any,
    @Query('assigneeId') assigneeId?: string,
    @Query('machineId') machineId?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
  ) {
    return this.tasksService.getKanbanBoard(user.organizationId, {
      assigneeId,
      machineId,
      type,
      priority,
    });
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my assigned tasks' })
  @ApiResponse({ status: 200, description: 'List of tasks assigned to current user' })
  getMyTasks(@CurrentUser() user: any) {
    return this.tasksService.getMyTasks(user.id, user.organizationId);
  }

  // ============================================================================
  // TASK CRUD
  // ============================================================================

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  create(@Body() data: CreateTaskDto, @CurrentUser() user: any) {
    return this.tasksService.create({
      ...data,
      createdByUserId: user.id,
      organizationId: user.organizationId,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by task type' })
  @ApiQuery({ name: 'machineId', required: false, description: 'Filter by machine ID' })
  @ApiQuery({ name: 'assigneeId', required: false, description: 'Filter by assignee ID' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by task number or description' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('machineId') machineId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
  ) {
    return this.tasksService.findAll(user.organizationId, {
      status,
      type,
      machineId,
      assigneeId,
      priority,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.findByIdOrFail(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Update task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, data as any);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: 'Delete task (soft delete)' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.remove(id);
  }

  // ============================================================================
  // TASK STATUS OPERATIONS
  // ============================================================================

  @Post(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Assign task to an operator' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task assigned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  assignTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: AssignTaskDto,
  ) {
    return this.tasksService.assignTask(id, data.userId);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start task execution' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task started successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  startTask(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.startTask(id, user.id);
  }

  @Post(':id/postpone')
  @ApiOperation({ summary: 'Postpone task with reason' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task postponed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  postponeTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: PostponeTaskDto,
  ) {
    return this.tasksService.postponeTask(id, data.reason);
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Reject a completed task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task rejected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  rejectTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: RejectTaskDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.rejectTask(id, data.reason, user.id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Cancel a task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  cancelTask(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.cancelTask(id);
  }

  @Post(':id/photo-before')
  @ApiOperation({ summary: 'Upload photo before task execution' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Photo uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Photo not expected in current status' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  uploadPhotoBefore(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: { photoUrl: string; latitude?: number; longitude?: number },
  ) {
    const location =
      data.latitude !== undefined && data.longitude !== undefined
        ? { latitude: data.latitude, longitude: data.longitude }
        : undefined;
    return this.tasksService.uploadPhotoBefore(id, data.photoUrl, location);
  }

  @Post(':id/photo-after')
  @ApiOperation({ summary: 'Upload photo after task execution and complete' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Photo uploaded and task completed' })
  @ApiResponse({ status: 400, description: 'Photo before is required first' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  uploadPhotoAfter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    data: {
      photoUrl: string;
      completionNotes?: string;
      latitude?: number;
      longitude?: number;
    },
  ) {
    const location =
      data.latitude !== undefined && data.longitude !== undefined
        ? { latitude: data.latitude, longitude: data.longitude }
        : undefined;
    return this.tasksService.uploadPhotoAfter(
      id,
      data.photoUrl,
      data.completionNotes,
      location,
    );
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'Task completed successfully' })
  @ApiResponse({ status: 400, description: 'Photo after is required' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  completeTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ) {
    return this.tasksService.completeTask(id, data);
  }

  // ============================================================================
  // TASK ITEMS
  // ============================================================================

  @Get(':id/items')
  @ApiOperation({ summary: 'Get task items' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'List of task items' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  getTaskItems(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.getTaskItems(id);
  }

  @Post(':id/items')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Add item to task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 201, description: 'Task item added successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  addTaskItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: CreateTaskItemDto,
  ) {
    return this.tasksService.addTaskItem(id, data);
  }

  @Patch(':id/items/:itemId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Update task item' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiParam({ name: 'itemId', description: 'Task item UUID' })
  @ApiResponse({ status: 200, description: 'Task item updated successfully' })
  @ApiResponse({ status: 404, description: 'Task item not found' })
  updateTaskItem(
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() data: UpdateTaskItemDto,
  ) {
    return this.tasksService.updateTaskItem(itemId, data);
  }

  @Delete(':id/items/:itemId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER)
  @ApiOperation({ summary: 'Remove task item (soft delete)' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiParam({ name: 'itemId', description: 'Task item UUID' })
  @ApiResponse({ status: 200, description: 'Task item removed successfully' })
  @ApiResponse({ status: 404, description: 'Task item not found' })
  removeTaskItem(
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.tasksService.removeTaskItem(itemId);
  }

  // ============================================================================
  // TASK COMMENTS
  // ============================================================================

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get task comments' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'List of task comments' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  getComments(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.getComments(id);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add comment to task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  addComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: CreateTaskCommentDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.addComment(id, user.id, data);
  }

  // ============================================================================
  // TASK COMPONENTS
  // ============================================================================

  @Get(':id/components')
  @ApiOperation({ summary: 'Get task components' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'List of task components' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  getComponents(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.getComponents(id);
  }

  @Post(':id/components')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Add component to task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 201, description: 'Component added successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  addComponent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: CreateTaskComponentDto,
  ) {
    return this.tasksService.addComponent(id, data);
  }

  // ============================================================================
  // TASK PHOTOS
  // ============================================================================

  @Get(':id/photos')
  @ApiOperation({ summary: 'Get task photos' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 200, description: 'List of task photos' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  getPhotos(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.getPhotos(id);
  }

  @Post(':id/photos')
  @ApiOperation({ summary: 'Add photo to task' })
  @ApiParam({ name: 'id', description: 'Task UUID' })
  @ApiResponse({ status: 201, description: 'Photo added successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  addPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: CreateTaskPhotoDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.addPhoto(id, user.id, data);
  }
}
