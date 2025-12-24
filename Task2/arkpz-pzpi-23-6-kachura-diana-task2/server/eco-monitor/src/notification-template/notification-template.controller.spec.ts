import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTemplateController } from './notification-template.controller';
import { NotificationTemplateService } from './notification-template.service';

describe('NotificationTemplateController', () => {
  let controller: NotificationTemplateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationTemplateController],
      providers: [NotificationTemplateService],
    }).compile();

    controller = module.get<NotificationTemplateController>(NotificationTemplateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
