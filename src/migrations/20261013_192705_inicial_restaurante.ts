import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`turnos\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`empleado_id\` integer NOT NULL,
  	\`fecha\` text NOT NULL,
  	\`hora_inicio\` text DEFAULT '09:00' NOT NULL,
  	\`hora_fin\` text DEFAULT '17:00' NOT NULL,
  	\`horas_totales\` numeric,
  	\`puesto\` text DEFAULT 'mesero' NOT NULL,
  	\`estado\` text DEFAULT 'programado' NOT NULL,
  	\`notas\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`empleado_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`turnos_empleado_idx\` ON \`turnos\` (\`empleado_id\`);`)
  await db.run(sql`CREATE INDEX \`turnos_fecha_idx\` ON \`turnos\` (\`fecha\`);`)
  await db.run(sql`CREATE INDEX \`turnos_updated_at_idx\` ON \`turnos\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`turnos_created_at_idx\` ON \`turnos\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`categorias\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`nombre\` text NOT NULL,
  	\`generate_slug\` integer DEFAULT true,
  	\`slug\` text NOT NULL,
  	\`descripcion\` text,
  	\`icono\` text,
  	\`imagen_id\` integer,
  	\`orden\` numeric DEFAULT 0,
  	\`activa\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`imagen_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`categorias_slug_idx\` ON \`categorias\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`categorias_imagen_idx\` ON \`categorias\` (\`imagen_id\`);`)
  await db.run(sql`CREATE INDEX \`categorias_orden_idx\` ON \`categorias\` (\`orden\`);`)
  await db.run(sql`CREATE INDEX \`categorias_activa_idx\` ON \`categorias\` (\`activa\`);`)
  await db.run(sql`CREATE INDEX \`categorias_updated_at_idx\` ON \`categorias\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`categorias_created_at_idx\` ON \`categorias\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`productos_etiquetas\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`productos\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`productos_etiquetas_order_idx\` ON \`productos_etiquetas\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`productos_etiquetas_parent_idx\` ON \`productos_etiquetas\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`productos_alergenos\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`productos\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`productos_alergenos_order_idx\` ON \`productos_alergenos\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`productos_alergenos_parent_idx\` ON \`productos_alergenos\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`productos_receta\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`ingrediente_id\` integer NOT NULL,
  	\`cantidad\` numeric NOT NULL,
  	\`unidad\` text,
  	\`notas\` text,
  	FOREIGN KEY (\`ingrediente_id\`) REFERENCES \`ingredientes\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`productos\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`productos_receta_order_idx\` ON \`productos_receta\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`productos_receta_parent_id_idx\` ON \`productos_receta\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`productos_receta_ingrediente_idx\` ON \`productos_receta\` (\`ingrediente_id\`);`)
  await db.run(sql`CREATE TABLE \`productos\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`nombre\` text NOT NULL,
  	\`generate_slug\` integer DEFAULT true,
  	\`slug\` text NOT NULL,
  	\`descripcion\` text,
  	\`categoria_id\` integer NOT NULL,
  	\`estacion\` text DEFAULT 'cocina' NOT NULL,
  	\`precio\` numeric NOT NULL,
  	\`precio_promocional\` numeric,
  	\`imagen_id\` integer,
  	\`costo_receta\` numeric,
  	\`rendimiento\` numeric DEFAULT 1,
  	\`controla_stock\` integer DEFAULT true,
  	\`disponible\` integer DEFAULT true,
  	\`destacado\` integer DEFAULT false,
  	\`tiempo_preparacion\` numeric DEFAULT 10,
  	\`orden\` numeric DEFAULT 0,
  	\`sku\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`categoria_id\`) REFERENCES \`categorias\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`imagen_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`productos_slug_idx\` ON \`productos\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`productos_categoria_idx\` ON \`productos\` (\`categoria_id\`);`)
  await db.run(sql`CREATE INDEX \`productos_estacion_idx\` ON \`productos\` (\`estacion\`);`)
  await db.run(sql`CREATE INDEX \`productos_precio_idx\` ON \`productos\` (\`precio\`);`)
  await db.run(sql`CREATE INDEX \`productos_imagen_idx\` ON \`productos\` (\`imagen_id\`);`)
  await db.run(sql`CREATE INDEX \`productos_disponible_idx\` ON \`productos\` (\`disponible\`);`)
  await db.run(sql`CREATE INDEX \`productos_updated_at_idx\` ON \`productos\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`productos_created_at_idx\` ON \`productos\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`productos_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`grupos_modificadores_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`productos\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`grupos_modificadores_id\`) REFERENCES \`grupos_modificadores\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`productos_rels_order_idx\` ON \`productos_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`productos_rels_parent_idx\` ON \`productos_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`productos_rels_path_idx\` ON \`productos_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`productos_rels_grupos_modificadores_id_idx\` ON \`productos_rels\` (\`grupos_modificadores_id\`);`)
  await db.run(sql`CREATE TABLE \`grupos_modificadores_opciones\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`nombre\` text NOT NULL,
  	\`precio_extra\` numeric DEFAULT 0,
  	\`por_defecto\` integer DEFAULT false,
  	\`disponible\` integer DEFAULT true,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`grupos_modificadores\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`grupos_modificadores_opciones_order_idx\` ON \`grupos_modificadores_opciones\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`grupos_modificadores_opciones_parent_id_idx\` ON \`grupos_modificadores_opciones\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`grupos_modificadores\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`nombre\` text NOT NULL,
  	\`descripcion\` text,
  	\`tipo\` text DEFAULT 'unica' NOT NULL,
  	\`obligatorio\` integer DEFAULT false,
  	\`min_selecciones\` numeric DEFAULT 0,
  	\`max_selecciones\` numeric DEFAULT 1,
  	\`unidad_referencia\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`grupos_modificadores_updated_at_idx\` ON \`grupos_modificadores\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`grupos_modificadores_created_at_idx\` ON \`grupos_modificadores\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`zonas\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`nombre\` text NOT NULL,
  	\`descripcion\` text,
  	\`color\` text DEFAULT '#0ea5e9',
  	\`orden\` numeric DEFAULT 0,
  	\`activa\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`zonas_updated_at_idx\` ON \`zonas\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`zonas_created_at_idx\` ON \`zonas\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`mesas\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`nombre\` text NOT NULL,
  	\`generate_slug\` integer DEFAULT true,
  	\`slug\` text NOT NULL,
  	\`zona_id\` integer,
  	\`capacidad\` numeric DEFAULT 4,
  	\`forma\` text DEFAULT 'cuadrada',
  	\`estado\` text DEFAULT 'libre' NOT NULL,
  	\`activa\` integer DEFAULT true,
  	\`posicion_x\` numeric DEFAULT 0,
  	\`posicion_y\` numeric DEFAULT 0,
  	\`notas\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`zona_id\`) REFERENCES \`zonas\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`mesas_slug_idx\` ON \`mesas\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`mesas_zona_idx\` ON \`mesas\` (\`zona_id\`);`)
  await db.run(sql`CREATE INDEX \`mesas_estado_idx\` ON \`mesas\` (\`estado\`);`)
  await db.run(sql`CREATE INDEX \`mesas_updated_at_idx\` ON \`mesas\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`mesas_created_at_idx\` ON \`mesas\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`pedidos_items_modificadores\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`nombre\` text NOT NULL,
  	\`precio_extra\` numeric DEFAULT 0,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pedidos_items\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pedidos_items_modificadores_order_idx\` ON \`pedidos_items_modificadores\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_items_modificadores_parent_id_idx\` ON \`pedidos_items_modificadores\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pedidos_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`producto_id\` integer NOT NULL,
  	\`cantidad\` numeric DEFAULT 1 NOT NULL,
  	\`nombre\` text,
  	\`precio_unitario\` numeric,
  	\`estacion\` text,
  	\`notas\` text,
  	\`estado_item\` text DEFAULT 'pendiente',
  	\`subtotal\` numeric,
  	FOREIGN KEY (\`producto_id\`) REFERENCES \`productos\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pedidos\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pedidos_items_order_idx\` ON \`pedidos_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_items_parent_id_idx\` ON \`pedidos_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_items_producto_idx\` ON \`pedidos_items\` (\`producto_id\`);`)
  await db.run(sql`CREATE TABLE \`pedidos_pagos\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`metodo\` text DEFAULT 'efectivo' NOT NULL,
  	\`monto\` numeric NOT NULL,
  	\`propina\` numeric DEFAULT 0,
  	\`referencia\` text,
  	\`fecha\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pedidos\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pedidos_pagos_order_idx\` ON \`pedidos_pagos\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_pagos_parent_id_idx\` ON \`pedidos_pagos\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pedidos\` (
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
  await db.run(sql`CREATE UNIQUE INDEX \`pedidos_folio_idx\` ON \`pedidos\` (\`folio\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_canal_idx\` ON \`pedidos\` (\`canal\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_estado_idx\` ON \`pedidos\` (\`estado\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_mesa_idx\` ON \`pedidos\` (\`mesa_id\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_cliente_idx\` ON \`pedidos\` (\`cliente_id\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_mesero_idx\` ON \`pedidos\` (\`mesero_id\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_cupon_idx\` ON \`pedidos\` (\`cupon_id\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_updated_at_idx\` ON \`pedidos\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`pedidos_created_at_idx\` ON \`pedidos\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`ingredientes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`nombre\` text NOT NULL,
  	\`sku\` text,
  	\`unidad\` text DEFAULT 'unidad' NOT NULL,
  	\`categoria\` text DEFAULT 'abarrote',
  	\`stock_actual\` numeric DEFAULT 0,
  	\`stock_minimo\` numeric DEFAULT 0,
  	\`stock_maximo\` numeric DEFAULT 0,
  	\`costo_unitario\` numeric DEFAULT 0,
  	\`proveedor_id\` integer,
  	\`ubicacion\` text,
  	\`perecedero\` integer DEFAULT false,
  	\`vida_util_dias\` numeric,
  	\`activo\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`proveedor_id\`) REFERENCES \`proveedores\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`ingredientes_proveedor_idx\` ON \`ingredientes\` (\`proveedor_id\`);`)
  await db.run(sql`CREATE INDEX \`ingredientes_updated_at_idx\` ON \`ingredientes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`ingredientes_created_at_idx\` ON \`ingredientes\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`proveedores\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`nombre\` text NOT NULL,
  	\`contacto\` text,
  	\`telefono\` text,
  	\`email\` text,
  	\`direccion\` text,
  	\`condiciones_pago\` text DEFAULT 'contado',
  	\`dias_entrega\` text,
  	\`notas\` text,
  	\`activo\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`proveedores_updated_at_idx\` ON \`proveedores\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`proveedores_created_at_idx\` ON \`proveedores\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`movimientos_inventario\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`ingrediente_id\` integer NOT NULL,
  	\`tipo\` text DEFAULT 'entrada' NOT NULL,
  	\`cantidad\` numeric NOT NULL,
  	\`costo_unitario\` numeric,
  	\`motivo\` text,
  	\`pedido_id\` integer,
  	\`usuario_id\` integer,
  	\`fecha\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`ingrediente_id\`) REFERENCES \`ingredientes\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`pedido_id\`) REFERENCES \`pedidos\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`usuario_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`movimientos_inventario_ingrediente_idx\` ON \`movimientos_inventario\` (\`ingrediente_id\`);`)
  await db.run(sql`CREATE INDEX \`movimientos_inventario_tipo_idx\` ON \`movimientos_inventario\` (\`tipo\`);`)
  await db.run(sql`CREATE INDEX \`movimientos_inventario_pedido_idx\` ON \`movimientos_inventario\` (\`pedido_id\`);`)
  await db.run(sql`CREATE INDEX \`movimientos_inventario_usuario_idx\` ON \`movimientos_inventario\` (\`usuario_id\`);`)
  await db.run(sql`CREATE INDEX \`movimientos_inventario_fecha_idx\` ON \`movimientos_inventario\` (\`fecha\`);`)
  await db.run(sql`CREATE INDEX \`movimientos_inventario_updated_at_idx\` ON \`movimientos_inventario\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`movimientos_inventario_created_at_idx\` ON \`movimientos_inventario\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`clientes_etiquetas\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`clientes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`clientes_etiquetas_order_idx\` ON \`clientes_etiquetas\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`clientes_etiquetas_parent_idx\` ON \`clientes_etiquetas\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`clientes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`nombre\` text NOT NULL,
  	\`telefono\` text,
  	\`email\` text,
  	\`fecha_nacimiento\` text,
  	\`puntos\` numeric DEFAULT 0,
  	\`nivel\` text DEFAULT 'bronce',
  	\`visitas\` numeric DEFAULT 0,
  	\`total_gastado\` numeric DEFAULT 0,
  	\`ticket_promedio\` numeric,
  	\`ultima_visita\` text,
  	\`acepta_marketing\` integer DEFAULT true,
  	\`direccion\` text,
  	\`notas\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`clientes_telefono_idx\` ON \`clientes\` (\`telefono\`);`)
  await db.run(sql`CREATE INDEX \`clientes_updated_at_idx\` ON \`clientes\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`clientes_created_at_idx\` ON \`clientes\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`recompensas\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`nombre\` text NOT NULL,
  	\`descripcion\` text,
  	\`tipo\` text DEFAULT 'producto_gratis' NOT NULL,
  	\`costo_puntos\` numeric DEFAULT 100 NOT NULL,
  	\`valor_descuento\` numeric,
  	\`producto_id\` integer,
  	\`imagen_id\` integer,
  	\`vigencia_desde\` text,
  	\`vigencia_hasta\` text,
  	\`activa\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`producto_id\`) REFERENCES \`productos\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`imagen_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`recompensas_producto_idx\` ON \`recompensas\` (\`producto_id\`);`)
  await db.run(sql`CREATE INDEX \`recompensas_imagen_idx\` ON \`recompensas\` (\`imagen_id\`);`)
  await db.run(sql`CREATE INDEX \`recompensas_updated_at_idx\` ON \`recompensas\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`recompensas_created_at_idx\` ON \`recompensas\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`cupones_canales\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`cupones\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`cupones_canales_order_idx\` ON \`cupones_canales\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`cupones_canales_parent_idx\` ON \`cupones_canales\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`cupones\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`codigo\` text NOT NULL,
  	\`descripcion\` text,
  	\`tipo\` text DEFAULT 'porcentaje' NOT NULL,
  	\`valor\` numeric NOT NULL,
  	\`minimo_compra\` numeric DEFAULT 0,
  	\`usos_maximos\` numeric DEFAULT 0,
  	\`usos_actuales\` numeric DEFAULT 0,
  	\`valido_desde\` text,
  	\`valido_hasta\` text,
  	\`activo\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`cupones_codigo_idx\` ON \`cupones\` (\`codigo\`);`)
  await db.run(sql`CREATE INDEX \`cupones_updated_at_idx\` ON \`cupones\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`cupones_created_at_idx\` ON \`cupones\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`campanas\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`nombre\` text NOT NULL,
  	\`canal\` text DEFAULT 'email' NOT NULL,
  	\`segmento\` text DEFAULT 'todos' NOT NULL,
  	\`asunto\` text,
  	\`mensaje\` text,
  	\`cupon_id\` integer,
  	\`estado\` text DEFAULT 'borrador' NOT NULL,
  	\`programada_para\` text,
  	\`enviados\` numeric DEFAULT 0,
  	\`aperturas\` numeric DEFAULT 0,
  	\`clics\` numeric DEFAULT 0,
  	\`conversiones\` numeric DEFAULT 0,
  	\`ingresos_generados\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`cupon_id\`) REFERENCES \`cupones\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`campanas_cupon_idx\` ON \`campanas\` (\`cupon_id\`);`)
  await db.run(sql`CREATE INDEX \`campanas_updated_at_idx\` ON \`campanas\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`campanas_created_at_idx\` ON \`campanas\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`reservaciones\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`nombre_cliente\` text NOT NULL,
  	\`cliente_id\` integer,
  	\`telefono\` text,
  	\`email\` text,
  	\`fecha\` text NOT NULL,
  	\`hora\` text DEFAULT '20:00' NOT NULL,
  	\`personas\` numeric DEFAULT 2 NOT NULL,
  	\`mesa_id\` integer,
  	\`zona_id\` integer,
  	\`estado\` text DEFAULT 'pendiente' NOT NULL,
  	\`ocasion\` text,
  	\`notas\` text,
  	\`creada_por_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`cliente_id\`) REFERENCES \`clientes\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`mesa_id\`) REFERENCES \`mesas\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`zona_id\`) REFERENCES \`zonas\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`creada_por_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`reservaciones_cliente_idx\` ON \`reservaciones\` (\`cliente_id\`);`)
  await db.run(sql`CREATE INDEX \`reservaciones_fecha_idx\` ON \`reservaciones\` (\`fecha\`);`)
  await db.run(sql`CREATE INDEX \`reservaciones_mesa_idx\` ON \`reservaciones\` (\`mesa_id\`);`)
  await db.run(sql`CREATE INDEX \`reservaciones_zona_idx\` ON \`reservaciones\` (\`zona_id\`);`)
  await db.run(sql`CREATE INDEX \`reservaciones_estado_idx\` ON \`reservaciones\` (\`estado\`);`)
  await db.run(sql`CREATE INDEX \`reservaciones_creada_por_idx\` ON \`reservaciones\` (\`creada_por_id\`);`)
  await db.run(sql`CREATE INDEX \`reservaciones_updated_at_idx\` ON \`reservaciones\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`reservaciones_created_at_idx\` ON \`reservaciones\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`ajustes_propinas_sugeridas\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`valor\` numeric NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`ajustes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`ajustes_propinas_sugeridas_order_idx\` ON \`ajustes_propinas_sugeridas\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`ajustes_propinas_sugeridas_parent_id_idx\` ON \`ajustes_propinas_sugeridas\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`ajustes_horarios\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`dia\` text NOT NULL,
  	\`abre\` text DEFAULT '13:00',
  	\`cierra\` text DEFAULT '23:00',
  	\`cerrado\` integer DEFAULT false,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`ajustes\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`ajustes_horarios_order_idx\` ON \`ajustes_horarios\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`ajustes_horarios_parent_id_idx\` ON \`ajustes_horarios\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`ajustes\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`nombre_comercial\` text DEFAULT 'Mangiare' NOT NULL,
  	\`eslogan\` text,
  	\`logo_id\` integer,
  	\`color_primario\` text DEFAULT '#c2410c',
  	\`color_secundario\` text DEFAULT '#1c1917',
  	\`telefono\` text,
  	\`email\` text,
  	\`direccion\` text,
  	\`instagram\` text,
  	\`moneda\` text DEFAULT 'MXN',
  	\`simbolo_moneda\` text DEFAULT '$',
  	\`impuesto_porcentaje\` numeric DEFAULT 16,
  	\`impuesto_incluido\` integer DEFAULT true,
  	\`servicio_porcentaje\` numeric DEFAULT 0,
  	\`puntos_por_unidad\` numeric DEFAULT 1,
  	\`valor_punto\` numeric DEFAULT 0.1,
  	\`tiempo_estimado_minutos\` numeric DEFAULT 25,
  	\`acepta_pedidos\` integer DEFAULT true,
  	\`aforo_maximo\` numeric DEFAULT 80,
  	\`mensaje_bienvenida\` text DEFAULT 'Bienvenido. Explora nuestra carta y ordena directo desde tu mesa.',
  	\`mensaje_pie\` text DEFAULT 'Gracias por tu visita',
  	\`nota_servicio\` text,
  	\`permitir_propina_cliente\` integer DEFAULT true,
  	\`encabezado_ticket\` text,
  	\`pie_ticket\` text DEFAULT '¡Gracias por su visita!',
  	\`identificacion_fiscal\` text,
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`ajustes_logo_idx\` ON \`ajustes\` (\`logo_id\`);`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`nombre\` text NOT NULL;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`apellidos\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`rol\` text DEFAULT 'mesero' NOT NULL;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`activo\` integer DEFAULT true;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`puesto\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`telefono\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`tarifa_hora\` numeric;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`fecha_ingreso\` text;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`avatar_id\` integer REFERENCES media(id);`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`notas\` text;`)
  await db.run(sql`CREATE INDEX \`users_avatar_idx\` ON \`users\` (\`avatar_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`turnos_id\` integer REFERENCES turnos(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`categorias_id\` integer REFERENCES categorias(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`productos_id\` integer REFERENCES productos(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`grupos_modificadores_id\` integer REFERENCES grupos_modificadores(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`zonas_id\` integer REFERENCES zonas(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`mesas_id\` integer REFERENCES mesas(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`pedidos_id\` integer REFERENCES pedidos(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`ingredientes_id\` integer REFERENCES ingredientes(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`proveedores_id\` integer REFERENCES proveedores(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`movimientos_inventario_id\` integer REFERENCES movimientos_inventario(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`clientes_id\` integer REFERENCES clientes(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`recompensas_id\` integer REFERENCES recompensas(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`cupones_id\` integer REFERENCES cupones(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`campanas_id\` integer REFERENCES campanas(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`reservaciones_id\` integer REFERENCES reservaciones(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_turnos_id_idx\` ON \`payload_locked_documents_rels\` (\`turnos_id\`);`)
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

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`turnos\`;`)
  await db.run(sql`DROP TABLE \`categorias\`;`)
  await db.run(sql`DROP TABLE \`productos_etiquetas\`;`)
  await db.run(sql`DROP TABLE \`productos_alergenos\`;`)
  await db.run(sql`DROP TABLE \`productos_receta\`;`)
  await db.run(sql`DROP TABLE \`productos\`;`)
  await db.run(sql`DROP TABLE \`productos_rels\`;`)
  await db.run(sql`DROP TABLE \`grupos_modificadores_opciones\`;`)
  await db.run(sql`DROP TABLE \`grupos_modificadores\`;`)
  await db.run(sql`DROP TABLE \`zonas\`;`)
  await db.run(sql`DROP TABLE \`mesas\`;`)
  await db.run(sql`DROP TABLE \`pedidos_items_modificadores\`;`)
  await db.run(sql`DROP TABLE \`pedidos_items\`;`)
  await db.run(sql`DROP TABLE \`pedidos_pagos\`;`)
  await db.run(sql`DROP TABLE \`pedidos\`;`)
  await db.run(sql`DROP TABLE \`ingredientes\`;`)
  await db.run(sql`DROP TABLE \`proveedores\`;`)
  await db.run(sql`DROP TABLE \`movimientos_inventario\`;`)
  await db.run(sql`DROP TABLE \`clientes_etiquetas\`;`)
  await db.run(sql`DROP TABLE \`clientes\`;`)
  await db.run(sql`DROP TABLE \`recompensas\`;`)
  await db.run(sql`DROP TABLE \`cupones_canales\`;`)
  await db.run(sql`DROP TABLE \`cupones\`;`)
  await db.run(sql`DROP TABLE \`campanas\`;`)
  await db.run(sql`DROP TABLE \`reservaciones\`;`)
  await db.run(sql`DROP TABLE \`ajustes_propinas_sugeridas\`;`)
  await db.run(sql`DROP TABLE \`ajustes_horarios\`;`)
  await db.run(sql`DROP TABLE \`ajustes\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`reset_password_requested_at\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text
  );
  `)
  await db.run(sql`INSERT INTO \`__new_users\`("id", "updated_at", "created_at", "email", "reset_password_token", "reset_password_expiration", "salt", "hash", "reset_password_requested_at", "login_attempts", "lock_until") SELECT "id", "updated_at", "created_at", "email", "reset_password_token", "reset_password_expiration", "salt", "hash", "reset_password_requested_at", "login_attempts", "lock_until" FROM \`users\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`ALTER TABLE \`__new_users\` RENAME TO \`users\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
}
