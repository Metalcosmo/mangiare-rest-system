import * as migration_20260918_151419_initial from './20260918_151419_initial';
import * as migration_20261013_192705_inicial_restaurante from './20261013_192705_inicial_restaurante';
import * as migration_20261014_175028_aprobacion_mesero from './20261014_175028_aprobacion_mesero';
import * as migration_20261015_163643_sesiones_mesa from './20261015_163643_sesiones_mesa';

export const migrations = [
  {
    up: migration_20260918_151419_initial.up,
    down: migration_20260918_151419_initial.down,
    name: '20260918_151419_initial',
  },
  {
    up: migration_20261013_192705_inicial_restaurante.up,
    down: migration_20261013_192705_inicial_restaurante.down,
    name: '20261013_192705_inicial_restaurante',
  },
  {
    up: migration_20261014_175028_aprobacion_mesero.up,
    down: migration_20261014_175028_aprobacion_mesero.down,
    name: '20261014_175028_aprobacion_mesero',
  },
  {
    up: migration_20261015_163643_sesiones_mesa.up,
    down: migration_20261015_163643_sesiones_mesa.down,
    name: '20261015_163643_sesiones_mesa'
  },
];
