import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`sesiones_mesa\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`mesa_id\` integer NOT NULL,
  	\`anfitrion_nombre\` text,
  	\`anfitrion_cedula\` text,
  	\`token_anfitrion\` text,
  	\`token_invitado\` text,
  	\`estado\` text DEFAULT 'abierta' NOT NULL,
  	\`origen\` text DEFAULT 'cliente',
  	\`motivo_cierre\` text,
  	\`abierta_en\` text,
  	\`cerrada_en\` text,
  	\`cerrada_por_id\` integer,
  	\`notas\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`mesa_id\`) REFERENCES \`mesas\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`cerrada_por_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`sesiones_mesa_mesa_idx\` ON \`sesiones_mesa\` (\`mesa_id\`);`)
  await db.run(sql`CREATE INDEX \`sesiones_mesa_anfitrion_cedula_idx\` ON \`sesiones_mesa\` (\`anfitrion_cedula\`);`)
  await db.run(sql`CREATE INDEX \`sesiones_mesa_estado_idx\` ON \`sesiones_mesa\` (\`estado\`);`)
  await db.run(sql`CREATE INDEX \`sesiones_mesa_cerrada_por_idx\` ON \`sesiones_mesa\` (\`cerrada_por_id\`);`)
  await db.run(sql`CREATE INDEX \`sesiones_mesa_updated_at_idx\` ON \`sesiones_mesa\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`sesiones_mesa_created_at_idx\` ON \`sesiones_mesa\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`pedidos\` ADD \`sesion_id\` integer REFERENCES sesiones_mesa(id);`)
  await db.run(sql`ALTER TABLE \`pedidos\` ADD \`ronda\` numeric;`)
  await db.run(sql`CREATE INDEX \`pedidos_sesion_idx\` ON \`pedidos\` (\`sesion_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`sesiones_mesa_id\` integer REFERENCES sesiones_mesa(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_sesiones_mesa_id_idx\` ON \`payload_locked_documents_rels\` (\`sesiones_mesa_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`sesiones_mesa\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_pedidos\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`folio\` text,
  	\`canal\` text DEFAULT 'mesa' NOT NULL,
  	\`estado\` text DEFAULT 'nuevo' NOT NULL,
  	\`mesa_id\` integer,
  	\`comensales\` numeric DEFAULT 1,
  	\`turno\` text DEFAULT 'comida',
  	\`cliente_nombre\` text,
  	\`cliente_telefono\` text,
  	\`cliente_id\` integer,
  	\`mesero_id\` integer,
  	\`notas\` text,
  	\`subtotal\` numeric,
  	\`descuento\` numeric DEFAULT 0,
  	\`impuesto\` numeric,
  	\`propina\` numeric DEFAULT 0,
  	\`total\` numeric,
  	\`costo_estimado\` numeric,
  	\`cupon_id\` integer,
  	\`hora_envio_cocina\` text,
  	\`hora_listo\` text,
  	\`hora_entrega\` text,
  	\`hora_cobro\` text,
  	\`hora_recogida\` text,
  	\`motivo_cancelacion\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`mesa_id\`) REFERENCES \`mesas\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`cliente_id\`) REFERENCES \`clientes\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`mesero_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`cupon_id\`) REFERENCES \`cupones\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_pedidos\`("id", "folio", "canal", "estado", "mesa_id", "comensales", "turno", "cliente_nombre", "cliente_telefono", "cliente_id", "mesero_id", "notas", "subtotal", "descuento", "impuesto", "propina", "total", "costo_estimado", "cupon_id", "hora_envio_cocina", "hora_listo", "hora_entrega", "hora_cobro", "hora_recogida", "motivo_cancelacion", "updated_at", "created_at") SELECT "id", "folio", "canal", "estado", "mesa_id", "comensales", "turno", "cliente_nombre", "cliente_telefono", "cliente_id", "mesero_id", "notas", "subtotal", "descuento", "impuesto", "propina", "total", "costo_estimado", "cupon_id", "hora_envio_cocina", "hora_listo", "hora_entrega", "hora_cobro", "hora_recogida", "motivo_cancelacion", "updated_at", "created_at" FROM \`pedidos\`;`)
  await db.run(sql`DROP TABLE \`pedidos\`;`)
  await db.run(sql`ALTER TABLE \`__new_pedidos\` RENAME TO \`pedidos\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE UNIQUE INDEX \`pedidos_folio_idx\` ON \`pedidos\` (\`folio\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_canal_idx\` ON \`pedidos\` (\`canal\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_estado_idx\` ON \`pedidos\` (\`estado\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_mesa_idx\` ON \`pedidos\` (\`mesa_id\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_cliente_idx\` ON \`pedidos\` (\`cliente_id\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_mesero_idx\` ON \`pedidos\` (\`mesero_id\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_cupon_idx\` ON \`pedidos\` (\`cupon_id\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_updated_at_idx\` ON \`pedidos\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_created_at_idx\` ON \`pedidos\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`turnos_id\` integer,
  	\`media_id\` integer,
  	\`categorias_id\` integer,
  	\`productos_id\` integer,
  	\`grupos_modificadores_id\` integer,
  	\`zonas_id\` integer,
  	\`mesas_id\` integer,
  	\`pedidos_id\` integer,
  	\`ingredientes_id\` integer,
  	\`proveedores_id\` integer,
  	\`movimientos_inventario_id\` integer,
  	\`clientes_id\` integer,
  	\`recompensas_id\` integer,
  	\`cupones_id\` integer,
  	\`campanas_id\` integer,
  	\`reservaciones_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`turnos_id\`) REFERENCES \`turnos\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`categorias_id\`) REFERENCES \`categorias\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`productos_id\`) REFERENCES \`productos\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`grupos_modificadores_id\`) REFERENCES \`grupos_modificadores\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`zonas_id\`) REFERENCES \`zonas\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`mesas_id\`) REFERENCES \`mesas\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pedidos_id\`) REFERENCES \`pedidos\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`ingredientes_id\`) REFERENCES \`ingredientes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`proveedores_id\`) REFERENCES \`proveedores\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`movimientos_inventario_id\`) REFERENCES \`movimientos_inventario\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`clientes_id\`) REFERENCES \`clientes\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`recompensas_id\`) REFERENCES \`recompensas\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`cupones_id\`) REFERENCES \`cupones\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`campanas_id\`) REFERENCES \`campanas\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`reservaciones_id\`) REFERENCES \`reservaciones\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "turnos_id", "media_id", "categorias_id", "productos_id", "grupos_modificadores_id", "zonas_id", "mesas_id", "pedidos_id", "ingredientes_id", "proveedores_id", "movimientos_inventario_id", "clientes_id", "recompensas_id", "cupones_id", "campanas_id", "reservaciones_id") SELECT "id", "order", "parent_id", "path", "users_id", "turnos_id", "media_id", "categorias_id", "productos_id", "grupos_modificadores_id", "zonas_id", "mesas_id", "pedidos_id", "ingredientes_id", "proveedores_id", "movimientos_inventario_id", "clientes_id", "recompensas_id", "cupones_id", "campanas_id", "reservaciones_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_turnos_id_idx\` ON \`payload_locked_documents_rels\` (\`turnos_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_categorias_id_idx\` ON \`payload_locked_documents_rels\` (\`categorias_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_productos_id_idx\` ON \`payload_locked_documents_rels\` (\`productos_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_grupos_modificadores_id_idx\` ON \`payload_locked_documents_rels\` (\`grupos_modificadores_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_zonas_id_idx\` ON \`payload_locked_documents_rels\` (\`zonas_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_mesas_id_idx\` ON \`payload_locked_documents_rels\` (\`mesas_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pedidos_id_idx\` ON \`payload_locked_documents_rels\` (\`pedidos_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_ingredientes_id_idx\` ON \`payload_locked_documents_rels\` (\`ingredientes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_proveedores_id_idx\` ON \`payload_locked_documents_rels\` (\`proveedores_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_movimientos_inventario_id_idx\` ON \`payload_locked_documents_rels\` (\`movimientos_inventario_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_clientes_id_idx\` ON \`payload_locked_documents_rels\` (\`clientes_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_recompensas_id_idx\` ON \`payload_locked_documents_rels\` (\`recompensas_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_cupones_id_idx\` ON \`payload_locked_documents_rels\` (\`cupones_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_campanas_id_idx\` ON \`payload_locked_documents_rels\` (\`campanas_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_reservaciones_id_idx\` ON \`payload_locked_documents_rels\` (\`reservaciones_id\`);`)
}
