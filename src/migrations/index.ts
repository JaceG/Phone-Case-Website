import * as migration_20260916_220509_initial from './20260916_220509_initial';

export const migrations = [
  {
    up: migration_20260916_220509_initial.up,
    down: migration_20260916_220509_initial.down,
    name: '20260916_220509_initial'
  },
];
