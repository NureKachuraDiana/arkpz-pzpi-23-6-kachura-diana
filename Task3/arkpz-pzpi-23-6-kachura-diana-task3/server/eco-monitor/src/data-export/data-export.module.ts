import { Module } from '@nestjs/common';
import { DataExportService } from './data-export.service';
import { DataExportController } from './data-export.controller';
import {SessionModule} from "../session/session.module";

@Module({
  controllers: [DataExportController],
  providers: [DataExportService],
  imports: [SessionModule]
})
export class DataExportModule {}
