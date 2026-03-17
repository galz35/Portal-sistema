const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { AuthService } = require('./dist/modules/auth/auth.service');

async function test() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);
  
  try {
    console.log('Testing listAllApps...');
    const apps = await authService.listAllApps();
    console.log('Apps load success:', apps.length);
  } catch (err) {
    console.error('Apps load failed:', err);
  }
  await app.close();
}

test();
