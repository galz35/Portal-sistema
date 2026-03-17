"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mailer_1 = require("@nestjs-modules/mailer");
const pug_adapter_1 = require("@nestjs-modules/mailer/dist/adapters/pug.adapter");
const notification_service_1 = require("./notification.service");
const path_1 = require("path");
const database_module_1 = require("../database/database.module");
let NotificationModule = class NotificationModule {
};
exports.NotificationModule = NotificationModule;
exports.NotificationModule = NotificationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            database_module_1.DatabaseModule,
            mailer_1.MailerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    transport: {
                        host: config.get('MAIL_HOST', 'smtp.gmail.com'),
                        port: config.get('MAIL_PORT', 465),
                        secure: config.get('MAIL_PORT', 465) == 465,
                        auth: {
                            user: config.get('MAIL_USER'),
                            pass: config.get('MAIL_PASSWORD'),
                        },
                    },
                    defaults: {
                        from: config.get('MAIL_FROM', '"Portal Central" <no-reply@portal.com>'),
                    },
                    template: {
                        dir: (0, path_1.join)(process.cwd(), 'src', 'shared', 'notification', 'templates'),
                        adapter: new pug_adapter_1.PugAdapter(),
                        options: {
                            strict: true,
                        },
                    },
                }),
            }),
        ],
        providers: [notification_service_1.NotificationService],
        exports: [notification_service_1.NotificationService],
    })
], NotificationModule);
