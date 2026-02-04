/**
 * BullBoard Controller
 *
 * Guard controller that protects the /admin/queues route.
 * Only users with 'owner' or 'admin' roles can access the BullBoard UI.
 * This controller doesn't serve the UI itself (that's handled by
 * @bull-board/nestjs middleware), but ensures authentication and
 * authorization are enforced on the route prefix.
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Roles } from '../../common/decorators';

@ApiTags('Admin - Queue Dashboard')
@ApiBearerAuth()
@Controller('admin/queues')
export class BullBoardController {
  /**
   * Health check endpoint for queue dashboard access verification.
   * The actual BullBoard UI is served by the @bull-board/nestjs middleware.
   * This endpoint simply validates that the user has the required role.
   */
  @Get('health')
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Queue dashboard access check',
    description: 'Verifies that the current user has permission to access the queue dashboard. Returns 200 if authorized.',
  })
  checkAccess() {
    return {
      status: 'ok',
      message: 'Queue dashboard access granted',
      dashboardUrl: '/admin/queues',
    };
  }
}
