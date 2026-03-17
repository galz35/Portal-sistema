import { IsString, IsOptional, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class LoginEmpleadoDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  usuario: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(128)
  clave: string;

  @IsOptional()
  @IsString()
  tipo_login?: string;

  @IsOptional()
  @IsString()
  returnUrl?: string;
}

export class IntrospectDto {
  @IsOptional()
  requireCsrf?: boolean;
}

export class EmployeeNamesDto {
  idsPersona: number[];
}
