// Descripción e ingredientes de cada galleta de la demo. Es la única fuente de
// estos datos: la usan el seed (BD nueva) y `npm run db:recetas` (BD con datos
// reales: solo crea/actualiza ingredientes y recetas, no borra nada).
//
// Normalización: la receta no es un texto con comas dentro de la galleta
// (atributo multivalor, rompe la 1FN). Cada ingrediente es una fila de
// `ingredientes` y la receta es la tabla asociativa `galleta_ingrediente`
// (N:M), con la posición del ingrediente en la lista (de mayor a menor cantidad).

// Alérgeno principal de cada ingrediente que lo tenga.
const ALERGENOS = {
  'Harina de trigo': 'Gluten',
  'Avena en hojuelas': 'Gluten',
  Mantequilla: 'Lácteos',
  Arequipe: 'Lácteos',
  'Chocolate blanco': 'Lácteos',
  'Chispas de chocolate belga': 'Soya',
  'Chocolate semiamargo': 'Soya',
  Huevo: 'Huevo',
  'Yema de huevo': 'Huevo',
  'Almendras tostadas': 'Frutos secos',
  'Almendra molida': 'Frutos secos',
};

// La clave es el nombre de la galleta tal como está en la BD.
const RECETAS = {
  'Chispas de Chocolate': {
    descripcion:
      'La clásica de siempre: masa dorada y mantequillosa con chispas de chocolate belga que se derriten al primer mordisco. Crujiente por los bordes y suave por dentro.',
    ingredientes: ['Harina de trigo', 'Mantequilla', 'Azúcar morena', 'Chispas de chocolate belga', 'Huevo', 'Esencia de vainilla', 'Bicarbonato de sodio', 'Sal'],
  },
  'Doble Chocolate': {
    descripcion:
      'Para los fanáticos del chocolate: masa de cacao oscuro con trozos de chocolate semiamargo y chocolate blanco. Húmeda, intensa y con el centro suave.',
    ingredientes: ['Harina de trigo', 'Mantequilla', 'Azúcar morena', 'Cacao en polvo', 'Chocolate semiamargo', 'Chocolate blanco', 'Huevo', 'Esencia de vainilla', 'Bicarbonato de sodio', 'Sal'],
  },
  'Choco Almendra': {
    descripcion:
      'Masa dorada con chocolate semiamargo y láminas de almendra tostada, terminada con un hilo de chocolate por encima. Crocante y con aroma a nuez.',
    ingredientes: ['Harina de trigo', 'Mantequilla', 'Azúcar morena', 'Chocolate semiamargo', 'Almendras tostadas', 'Huevo', 'Esencia de vainilla', 'Bicarbonato de sodio', 'Sal'],
  },
  'Avena y Pasas': {
    descripcion:
      'Masa rústica de avena integral con pasas jugosas, miel y un toque de canela. Sabor casero, ideal para acompañar con café.',
    ingredientes: ['Avena en hojuelas', 'Harina de trigo', 'Mantequilla', 'Azúcar morena', 'Pasas', 'Miel', 'Huevo', 'Canela', 'Bicarbonato de sodio', 'Sal'],
  },
  'Avena y Coco': {
    descripcion:
      'Avena con coco rallado tostado que le da aroma tropical y un borde crocante. Dulce, suave y muy aromática.',
    ingredientes: ['Avena en hojuelas', 'Harina de trigo', 'Mantequilla', 'Azúcar morena', 'Coco rallado', 'Huevo', 'Esencia de vainilla', 'Bicarbonato de sodio', 'Sal'],
  },
  'Oatmeal Cookie': {
    descripcion:
      'Receta clásica de avena con canela y azúcar morena: gruesa, masticable y con hojuelas enteras. Agotada por ahora, próximo lote en camino.',
    ingredientes: ['Avena en hojuelas', 'Harina de trigo', 'Mantequilla', 'Azúcar morena', 'Huevo', 'Canela', 'Esencia de vainilla', 'Bicarbonato de sodio', 'Sal'],
  },
  'Mantequilla Clasica': {
    descripcion:
      'Receta tradicional: pocos ingredientes, bien hechos. Mucha mantequilla, masa fina y un borde dorado que se deshace en la boca.',
    ingredientes: ['Harina de trigo', 'Mantequilla', 'Azúcar', 'Yema de huevo', 'Esencia de vainilla', 'Sal'],
  },
  'Sable de Mantequilla': {
    descripcion:
      'Sablé a la francesa: masa arenosa de mantequilla, horneada despacio y con el borde pasado por azúcar cristalizada. Crocante y delicada.',
    ingredientes: ['Harina de trigo', 'Mantequilla', 'Azúcar glas', 'Yema de huevo', 'Azúcar cristalizada', 'Esencia de vainilla', 'Sal'],
  },
  'Rellena de Arequipe': {
    descripcion:
      'Dos galletas de mantequilla unidas con arequipe cremoso y espolvoreadas con azúcar glas. Suaves, dulces y muy colombianas.',
    ingredientes: ['Harina de trigo', 'Mantequilla', 'Arequipe', 'Azúcar glas', 'Maicena', 'Yema de huevo', 'Esencia de vainilla'],
  },
  'Rellena de Frambuesa': {
    descripcion:
      'Galleta tipo Linzer con ventana en forma de corazón y mermelada de frambuesa, cubierta de azúcar glas. Dulce con un toque ácido.',
    ingredientes: ['Harina de trigo', 'Mantequilla', 'Almendra molida', 'Azúcar glas', 'Mermelada de frambuesa', 'Yema de huevo', 'Esencia de vainilla', 'Sal'],
  },
};

// Aplica descripción y receta a las galletas que existan por nombre; las que
// el administrador haya creado con otro nombre no se tocan. Devuelve cuántas
// galletas actualizó.
async function aplicarRecetas(prisma) {
  const galletas = await prisma.galleta.findMany({ select: { id: true, nombre: true } });
  let aplicadas = 0;
  for (const g of galletas) {
    const receta = RECETAS[g.nombre];
    if (!receta) continue;
    await prisma.$transaction(async (tx) => {
      await tx.galleta.update({ where: { id: g.id }, data: { descripcion: receta.descripcion } });
      await tx.galletaIngrediente.deleteMany({ where: { galletaId: g.id } });
      for (const [i, nombre] of receta.ingredientes.entries()) {
        const alergeno = ALERGENOS[nombre] ?? null;
        const ingrediente = await tx.ingrediente.upsert({
          where: { nombre },
          update: { alergeno },
          create: { nombre, alergeno },
        });
        await tx.galletaIngrediente.create({
          data: { galletaId: g.id, ingredienteId: ingrediente.id, posicion: i + 1 },
        });
      }
    });
    aplicadas++;
  }
  return aplicadas;
}

module.exports = { RECETAS, ALERGENOS, aplicarRecetas };
