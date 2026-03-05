-- Seed data: contenido_bienestar + retos_semanales

-- ============================================================
-- TABLE 1: contenido_bienestar (48 rows)
-- ============================================================

INSERT INTO contenido_bienestar (orden, categoria, titulo, cuerpo, icono) VALUES
(1, 'fortalecimiento', 'Piernas fuertes, ballet seguro',
E'El ballet exige piernas fuertes para sostener cada posición. Estos 3 ejercicios puedes hacerlos en casa sin equipamiento.\n\n1. **Sentadillas lentas (plié en paralelo):** 3 series de 10. Baja en 4 tiempos, sube en 4 tiempos. Rodillas alineadas con los pies.\n\n2. **Elevaciones de talón (relevés):** 3 series de 15. De pie, sube a media punta y baja lento. Si puedes, hazlo en un escalón para mayor rango.\n\n3. **Equilibrio en una pierna:** 30 segundos cada lado, 3 repeticiones. Mantén la cadera nivelada.',
'dumbbell'),

(2, 'cultura_ballet', '¿Por qué hablamos en francés en ballet?',
E'Todos los pasos de ballet tienen nombres en francés. Esto no es casualidad: el ballet como lo conocemos nació en la corte francesa del siglo XVII, bajo el reinado de Luis XIV.\n\nLuis XIV era bailarín él mismo y fundó la primera academia de danza en 1661: la Académie Royale de Danse. Fue ahí donde se codificaron los pasos y se les dieron nombres en francés.\n\nCuando tu profesora dice "tendu", estás usando una palabra que lleva más de 350 años viéndose exactamente igual en estudios de ballet de todo el mundo. Es un idioma universal de la danza.',
'ballet-shoe'),

(3, 'estiramiento', 'Rutina de caderas para bailar mejor',
E'Las caderas son la articulación más importante en ballet después de los tobillos. Abrirlas progresivamente mejora tu en dehors y tu comodidad en primera y segunda posición.\n\n1. **Mariposa sentada:** sentada con plantas de los pies juntas, deja caer las rodillas suavemente. No empujes. Respira 10 veces profundo.\n\n2. **Pigeon stretch:** desde cuatro puntos, lleva una rodilla hacia adelante y extiende la otra pierna atrás. Mantén 30 segundos cada lado.\n\n3. **Sentadilla profunda (malasana):** pies separados, baja lo más que puedas manteniendo talones en el piso. 30 segundos.\n\nHaz esta rutina 3 veces por semana después de una ducha caliente.',
'stretch'),

(4, 'bienestar_mental', 'No te compares con nadie en clase',
E'Es tentador mirar a la compañera que tiene mejor flexibilidad o que hace el paso con más facilidad. Pero cada cuerpo llega con una historia diferente.\n\nLa alumna que parece "natural" quizás hizo gimnasia de niña. La que tiene mejor flexibilidad quizás lleva años haciendo yoga. Tú estás construyendo tu propia base desde cero, y eso tiene un valor enorme.\n\nLa única comparación que vale es contigo misma: ¿hoy pude hacer algo que hace un mes no podía? Eso es progreso real.\n\nEl ballet es un camino personal. Disfrútalo a tu ritmo.',
'brain'),

(5, 'fortalecimiento', 'Core: el centro de todo en ballet',
E'Cuando tu profesora dice "activa el core" se refiere a los músculos profundos del abdomen y la espalda baja que estabilizan tu torso. Sin un core fuerte, el equilibrio es imposible.\n\n1. **Plancha frontal:** 3 series de 20-30 segundos. Cuerpo recto como una tabla. No levantes la cadera ni la dejes caer.\n\n2. **Dead bug:** acostada boca arriba, extiende brazo derecho y pierna izquierda simultáneamente sin despegar la espalda baja del piso. 10 repeticiones cada lado.\n\n3. **Bird dog:** en cuatro puntos, extiende brazo y pierna opuestos. 10 cada lado.\n\nEstos ejercicios mejoran directamente tu equilibrio en clase.',
'dumbbell'),

(6, 'salud', 'Cómo evitar calambres en clase',
E'Los calambres en pantorrillas y pies son comunes cuando empiezas ballet, especialmente durante los relevés. No son peligrosos pero sí molestos.\n\n**Causas principales:** deshidratación, falta de magnesio, músculos fríos, o sobreexigencia en pies no acostumbrados.\n\n**Prevención:**\n- Toma al menos 1 litro de agua durante el día (no solo en clase).\n- Come un banano 1-2 horas antes de clase (potasio + magnesio).\n- Antes de los relevés, haz círculos con los tobillos para calentar.\n- Si te da calambre: estira el pie hacia arriba (flex), no hacia abajo.\n\nSi los calambres son frecuentes, considera un suplemento de magnesio.',
'heart-pulse'),

(7, 'cultura_ballet', 'El Lago de los Cisnes: la obra más famosa del ballet',
E'Si alguien piensa en ballet, piensa en El Lago de los Cisnes. La música es de Tchaikovsky y se estrenó en 1877 en Moscú.\n\n**La historia:** el príncipe Sigfrido se enamora de Odette, una princesa convertida en cisne por un hechizo. Solo puede ser humana de noche. El villano Rothbart presenta a su hija Odile disfrazada de Odette para engañar al príncipe.\n\n**Lo que lo hace especial:** la misma bailarina interpreta a Odette (cisne blanco, puro, vulnerable) y a Odile (cisne negro, seductor, engañoso). Es uno de los retos más grandes del ballet clásico.\n\nBúscalo en YouTube: cualquier versión del Bolshoi o el Royal Ballet vale la pena.',
'ballet-shoe'),

(8, 'estiramiento', 'Isquiotibiales: estirar sin forzar',
E'Los isquiotibiales (parte posterior del muslo) son los músculos más rebeldes para estirar. Si los fuerzas, se contracturan más. La clave es paciencia.\n\n1. **Estiramiento de pie:** pon un pie sobre una silla (no muy alta). Mantén ambas caderas mirando al frente. Inclina el torso suavemente. 30 segundos cada lado.\n\n2. **Estiramiento acostada:** acostada boca arriba, sube una pierna recta y sostenla con las manos o una toalla detrás del muslo. Sin forzar la rodilla. 30 segundos.\n\n3. **Estiramiento sentada:** piernas estiradas al frente, flexiona desde la cadera (no desde la espalda). Imagina que el ombligo quiere tocar los muslos.\n\nNunca rebotes. El estiramiento es estático y con respiración.',
'stretch'),

(9, 'fortalecimiento', 'Tobillos fuertes para relevés estables',
E'Los tobillos son la base de tu trabajo en media punta. Si están débiles, los relevés se sienten inseguros y aumenta el riesgo de torceduras.\n\n1. **Theraband (si tienes):** sentada con pierna estirada, envuelve la banda en la planta del pie. Empuja la punta (point) contra la resistencia. 3 series de 15 cada pie.\n\n2. **Sin banda:** sentada, haz círculos completos con cada pie. 10 en cada dirección. Lento y con control.\n\n3. **Relevé en un pie:** de pie, sube a media punta en un solo pie. 3 series de 8 cada lado. Usa una pared para equilibrio si es necesario.\n\n4. **Escritura con el pie:** sentada, "escribe" el abecedario en el aire con la punta del pie. Trabaja todos los músculos pequeños.',
'dumbbell'),

(10, 'bienestar_mental', 'La frustración es parte del proceso',
E'Habrá clases donde sientas que nada te sale. Donde el paso que la semana pasada te salió bien, hoy parece imposible. Donde tu cuerpo no responde como quieres.\n\nEso es completamente normal. El aprendizaje no es lineal — es una espiral. A veces parece que retrocedes, pero en realidad estás procesando información nueva.\n\nLos neurólogos lo llaman "interferencia de aprendizaje": cuando aprendes algo nuevo, temporalmente afecta lo que ya sabías. Es señal de que tu cerebro está reorganizando conexiones.\n\nLa próxima vez que sientas frustración, respira y recuerda: si fuera fácil, no sería ballet.',
'brain'),

(11, 'salud', '¿Qué comer antes y después de clase?',
E'Bailar con el estómago lleno es incómodo. Bailar en ayunas te deja sin energía. El balance es clave.\n\n**Antes de clase (1-2 horas antes):** algo ligero con carbohidratos y un poco de proteína. Un banano con mantequilla de maní. Un yogurt con granola. Unas galletas integrales con queso.\n\n**Evita:** comidas pesadas, frituras, mucha fibra (causan molestias al hacer pliés profundos).\n\n**Después de clase (dentro de la primera hora):** tu cuerpo necesita recuperarse. Proteína + carbohidratos. Pollo con arroz. Un batido de frutas con proteína. Huevos con pan integral.\n\n**Hidratación:** toma agua durante todo el día, no solo durante la clase.',
'heart-pulse'),

(12, 'cultura_ballet', '¿Qué es la barra y por qué empezamos ahí?',
E'La barra no es solo un palo para sostenerte. Es una herramienta pedagógica con siglos de historia.\n\nLa barra permite que te concentres en la técnica de una sola pierna mientras la otra mano te da estabilidad. Es como las rueditas de entrenamiento en una bicicleta: te permiten practicar el movimiento correcto sin preocuparte por el equilibrio.\n\nEl orden de ejercicios en la barra no es aleatorio. Sigue una progresión fisiológica: pliés (calentar articulaciones), tendus (activar pies), jetés (velocidad), rond de jambe (movilidad de cadera), fondus (control), relevés (fuerza).\n\nCada ejercicio prepara al cuerpo para el siguiente. Por eso nunca empezamos con saltos.',
'ballet-shoe'),

(13, 'fortalecimiento', 'Espalda fuerte, postura elegante',
E'La postura de ballet nace de una espalda fuerte. No se trata de forzar los hombros hacia atrás, sino de activar los músculos que sostienen la columna naturalmente.\n\n1. **Superman:** acostada boca abajo, levanta brazos y piernas del piso simultáneamente. 3 segundos arriba, baja. 3 series de 10.\n\n2. **Remo con banda o botellas de agua:** inclina el torso 45 grados, lleva los codos hacia atrás apretando los omóplatos. 3 series de 12.\n\n3. **Wall angels:** de pie contra la pared, brazos en "L". Sube y baja los brazos manteniendo contacto con la pared. 3 series de 10.\n\nEstos ejercicios eliminan el dolor de espalda y mejoran visiblemente tu porte en clase.',
'dumbbell'),

(14, 'estiramiento', 'Rutina de espalda: 5 minutos antes de dormir',
E'La espalda acumula tensión del trabajo, del estrés y de la clase de ballet. Esta rutina la relaja y mejora tu flexibilidad gradualmente.\n\n1. **Gato-vaca:** en cuatro puntos, arquea y redondea la espalda alternando. 10 repeticiones lentas coordinando con la respiración.\n\n2. **Torsión acostada:** acostada boca arriba, cruza una rodilla al lado opuesto. Brazos en cruz. Mantén 30 segundos cada lado.\n\n3. **Rodillas al pecho:** acostada, abraza ambas rodillas y mécete suavemente de lado a lado. 30 segundos.\n\n4. **Estiramiento de niño (child''s pose):** de rodillas, baja el torso al piso con los brazos extendidos. 30 segundos.\n\nRespona profundo en cada posición. El estiramiento ocurre en la exhalación.',
'stretch'),

(15, 'bienestar_mental', 'Por qué el ballet reduce el estrés',
E'No es solo porque "te mueves y liberas endorfinas." El ballet tiene un mecanismo específico contra el estrés que otros ejercicios no tienen.\n\nCuando haces ballet, tu cerebro no puede pensar en otra cosa. Tienes que recordar la secuencia, coordinar brazos y piernas, escuchar la música, mantener la postura. No queda espacio mental para las preocupaciones del día.\n\nLos psicólogos llaman a esto "estado de flujo" (flow state): estar tan concentrada en una actividad que todo lo demás desaparece. Es como meditar pero en movimiento.\n\nPor eso muchas alumnas dicen que salen de clase "renovadas" aunque estén físicamente cansadas. El cansancio físico es agradable; el cansancio mental se fue.',
'brain'),

(16, 'salud', 'Cuida tus pies: la herramienta más importante',
E'En ballet, tus pies trabajan más que en cualquier otra actividad. Merecen atención especial.\n\n**Después de clase:** rueda una pelota de tenis bajo la planta del pie presionando suavemente. 2 minutos cada pie. Esto libera la fascia plantar y previene dolor.\n\n**Uñas:** mantenlas cortas y rectas. Las uñas largas se presionan contra la zapatilla y causan dolor o uñeros.\n\n**Hidratación:** aplica crema en los pies antes de dormir. La piel seca se agrieta y causa molestias dentro de la zapatilla.\n\n**Callos:** son normales y en realidad protegen tu pie. No los retires agresivamente — solo límalos suavemente si molestan.\n\nSecar bien entre los dedos después de bañarse para evitar hongos.',
'heart-pulse'),

(17, 'fortalecimiento', 'Glúteos: el motor secreto del ballet',
E'Los glúteos son responsables de la rotación externa (en dehors), la extensión de la pierna hacia atrás (arabesque) y la estabilidad de la pelvis. Son el motor que no se ve.\n\n1. **Puente de glúteos:** acostada, pies en el piso, sube la cadera apretando glúteos arriba. 3 series de 15. Para más reto: hazlo con una sola pierna.\n\n2. **Clamshell:** acostada de lado, rodillas dobladas, abre la rodilla de arriba como una almeja. No muevas la cadera. 3 series de 15 cada lado.\n\n3. **Sentadilla tipo ballet:** pies en primera posición (o lo más cerca que puedas), baja manteniendo la espalda recta. 3 series de 10.\n\nSi sientes estos músculos trabajando, tu en dehors mejorará notablemente.',
'dumbbell'),

(18, 'cultura_ballet', '¿Qué significa plié, tendu y relevé?',
E'Cada nombre en ballet describe exactamente lo que haces. El francés es descriptivo: si sabes qué significa la palabra, sabes qué hace tu cuerpo.\n\n**Plié** = "doblado." Doblas las rodillas. Así de simple.\n\n**Tendu** = "estirado." Estiras el pie deslizándolo por el piso hasta la punta.\n\n**Relevé** = "levantado." Te levantas sobre la media punta.\n\n**Dégagé** = "despegado." El pie se despega del piso (un tendu que se eleva).\n\n**Fondu** = "derretido." La pierna de apoyo se dobla suavemente como si te derritieras.\n\n**Rond de jambe** = "círculo de pierna." La pierna dibuja un círculo.\n\nLa próxima vez que escuches un término nuevo, pregúntale a tu profesora qué significa en francés. La traducción casi siempre te explica el movimiento.',
'ballet-shoe'),

(19, 'estiramiento', 'Abre tus hombros para un mejor port de bras',
E'Los hombros tensos son el enemigo del port de bras elegante. Si vives frente a una computadora, tus hombros están probablemente adelantados y cerrados.\n\n1. **Estiramiento de pectoral en puerta:** pon el antebrazo contra el marco de una puerta, da un paso adelante. Siente la apertura en el pecho. 30 segundos cada lado.\n\n2. **Entrelazar manos atrás:** de pie, entrelaza las manos detrás de la espalda y sube los brazos. Pecho abierto. 20 segundos.\n\n3. **Círculos de hombros:** 10 hacia adelante, 10 hacia atrás. Lentos y amplios.\n\n4. **Águila (eagle arms):** cruza un brazo sobre otro, entrelaza y sube los codos. 20 segundos cada cruce.\n\nHaz estos estiramientos diario, especialmente si trabajas sentada. Tu port de bras lo agradecerá.',
'stretch'),

(20, 'bienestar_mental', 'Permiso para ser principiante',
E'En la vida adulta estamos acostumbradas a ser competentes. Sabemos hacer nuestro trabajo, manejamos nuestra casa, resolvemos problemas. Y de repente llegas a ballet y no sabes ni dónde poner los brazos.\n\nEsa incomodidad de ser principiante es valiosa. Te recuerda lo que se siente aprender algo desde cero. Te da humildad y perspectiva.\n\nNo tienes que ser buena en ballet para que valga la pena. El acto de intentar, de mover tu cuerpo de formas nuevas, de escuchar música clásica y concentrarte en algo bello — eso ya es suficiente.\n\nNo viniste a ser bailarina profesional. Viniste a descubrir algo nuevo sobre ti misma. Y eso está pasando, clase a clase, aunque no lo notes.',
'brain'),

(21, 'fortalecimiento', 'Rutina de 10 minutos para días sin clase',
E'Los días que no tienes ballet, este circuito rápido mantiene tu cuerpo activo y listo.\n\n1. Pliés en paralelo (sentadillas): 15 repeticiones.\n2. Relevés en dos pies: 15 repeticiones.\n3. Plancha frontal: 20 segundos.\n4. Puente de glúteos: 15 repeticiones.\n5. Equilibrio en un pie: 20 segundos cada lado.\n\nDescansa 30 segundos y repite el circuito 2 veces más.\n\nTiempo total: 10 minutos. No necesitas ropa especial ni equipamiento. Puedes hacerlo en la sala de tu casa.\n\nLa clave es la consistencia: 10 minutos 3 veces por semana hace más diferencia que una hora una vez al mes.',
'dumbbell'),

(22, 'salud', 'Dolor muscular vs. dolor articular: la diferencia importa',
E'Después de clase es normal sentir músculos cansados. Pero hay un dolor que está bien y otro que no.\n\n**Dolor muscular (normal):** sensación de cansancio o rigidez en los músculos 24-48 horas después de clase. Se siente en la "carne" del músculo. Mejora con movimiento suave y estiramiento. Es señal de que el músculo está adaptándose.\n\n**Dolor articular (atención):** se siente en las articulaciones (rodillas, tobillos, caderas). Es agudo, puntual, y empeora con el movimiento. Puede indicar que algo se está forzando mal.\n\n**Regla:** si duele un músculo, estira. Si duele una articulación, para y consulta.\n\nNunca "aguantes" dolor articular en clase. Avísale a tu profesora. Es mejor modificar un ejercicio que lesionarte.',
'heart-pulse'),

(23, 'cultura_ballet', 'Las 5 posiciones de pies: el ADN del ballet',
E'Todo el ballet clásico se construye sobre 5 posiciones de pies. Fueron codificadas por Pierre Beauchamp en el siglo XVII y no han cambiado desde entonces.\n\n**Primera posición:** talones juntos, puntas hacia afuera. La base de todo.\n\n**Segunda posición:** pies separados al ancho de hombros, puntas hacia afuera.\n\n**Tercera posición:** un pie delante del otro, talón del pie delantero contra el arco del de atrás.\n\n**Cuarta posición:** un pie delante del otro separados por un pie de distancia.\n\n**Quinta posición:** un pie delante del otro, completamente cruzados. La más difícil.\n\nComo principiante, te concentras en primera y segunda. La quinta llegará con el tiempo. No la fuerces.',
'ballet-shoe'),

(24, 'estiramiento', 'Estiramiento de empeines para mejorar tu punta',
E'Un empeine flexible hace que tu pie se vea hermoso en punta y mejora la articulación del pie en tendus y jetés.\n\n1. **Sentada sobre los empeines:** de rodillas, siéntate sobre tus talones con los empeines en el piso. Mantén 20-30 segundos. Si duele mucho, pon una toalla enrollada debajo.\n\n2. **Point y flex:** sentada con piernas estiradas, alterna entre apuntar los pies (point) y flexionar (flex). 15 repeticiones. Lento y controlado.\n\n3. **Toalla bajo los dedos:** sentada, pon una toalla enrollada bajo los dedos de los pies y presiona el empeine hacia abajo. 20 segundos.\n\nImportante: el empeine mejora MUY lentamente. No fuerces. Es cuestión de meses, no de días.',
'stretch'),

(25, 'bienestar_mental', 'La respiración que cambia tu clase',
E'Muchas alumnas aguantan la respiración cuando se concentran en un paso difícil. Eso tensa todo el cuerpo y hace el movimiento más difícil.\n\nLa regla en ballet es: **exhala en el esfuerzo**. Cuando subes a relevé, exhala. Cuando te doblas en plié, inhala. Cuando extiendes la pierna, exhala.\n\nPrueba esto antes de tu próxima clase: 5 minutos de respiración consciente. Inhala en 4 tiempos por la nariz. Exhala en 6 tiempos por la boca. Esto activa tu sistema nervioso parasimpático (el de "calma") y llegarás a clase más centrada.\n\nLa respiración no es un extra. Es parte de la técnica.',
'brain'),

(26, 'fortalecimiento', 'Fortalece tus pies: la base invisible',
E'Los pies tienen 26 huesos y más de 100 músculos, tendones y ligamentos. En ballet, trabajan constantemente. Fortalecerlos mejora todo.\n\n1. **Towel scrunch:** pon una toalla en el piso y arrugarla con los dedos del pie. 3 series de 10 cada pie.\n\n2. **Marble pickup:** recoge canicas (o tapas de botella) del piso con los dedos del pie. 10 por pie.\n\n3. **Doming:** de pie, intenta "acortar" el pie presionando los dedos contra el piso sin encogerlos. Como si quisieras hacer un arco más alto. 10 repeticiones.\n\n4. **Relevé lento:** sube a media punta en 8 tiempos, baja en 8 tiempos. 5 repeticiones.\n\nEstos ejercicios los puedes hacer viendo televisión. Tus pies te lo agradecerán.',
'dumbbell'),

(27, 'salud', 'Protege tus rodillas en ballet',
E'Las rodillas son la articulación más vulnerable en ballet. La buena noticia: casi todas las lesiones de rodilla en adultas son prevenibles.\n\n**Regla de oro:** la rodilla siempre mira en la misma dirección que los dedos del pie. Si tu pie apunta a las 10 y tu rodilla a las 12, estás forzando la articulación.\n\n**En plié:** la rodilla va directo sobre el segundo y tercer dedo del pie. Si se va hacia adentro, reduce la rotación de los pies hasta que puedas mantener la alineación.\n\n**Nunca bloquees las rodillas:** en tendu, la pierna está estirada pero no hiperextendida. "Estirada" no significa "trabada."\n\nSi sientes molestia en la rodilla durante un ejercicio, avísale a tu profesora. Siempre se puede modificar.',
'heart-pulse'),

(28, 'cultura_ballet', 'Anna Pavlova: la bailarina que cambió todo',
E'Anna Pavlova (1881-1931) fue la bailarina más famosa de su época. Nació en San Petersburgo, Rusia, y estudió en la Escuela Imperial de Ballet.\n\nLo que la hacía especial no era su técnica perfecta — de hecho, tenía pies con arcos muy altos que le causaban dolor constante. Lo que la hacía única era su expresividad. Cuando bailaba, el público lloraba.\n\nSu solo más famoso, "La muerte del cisne" (1905), dura solo 4 minutos pero es considerado uno de los momentos más importantes de la historia de la danza.\n\nPavlova viajó por el mundo llevando el ballet a países donde nunca se había visto. Se dice que inspiró a más personas a amar el ballet que cualquier otra bailarina en la historia.',
'ballet-shoe'),

(29, 'estiramiento', 'Estiramientos de pantorrillas para después de clase',
E'Las pantorrillas trabajan intensamente en ballet: cada relevé, cada salto, cada paso en media punta las exige. Estirarlas después de clase es fundamental.\n\n1. **Estiramiento en pared:** manos en la pared, una pierna atrás con talón en el piso. Inclina el cuerpo hacia la pared. 30 segundos cada lado.\n\n2. **Escalón:** parada en un escalón con los talones colgando, baja lentamente. 20 segundos. Este estiramiento es profundo; no fuerces.\n\n3. **Estiramiento sentada con toalla:** pierna estirada, pasa una toalla por la planta del pie y tira suavemente manteniendo la rodilla recta. 30 segundos.\n\nSi no estiras las pantorrillas regularmente, se acortan y limitan tu plié. Dedicarles 2 minutos después de cada clase hace una diferencia enorme.',
'stretch'),

(30, 'bienestar_mental', 'El espejo no es tu enemigo',
E'Muchas alumnas adultas tienen una relación complicada con el espejo del estudio. "Me veo rara", "mi cuerpo no se ve como el de las demás", "prefiero no mirarme."\n\nPero el espejo en ballet no está para juzgar cómo te ves. Es una herramienta técnica. Te permite verificar la alineación de tu cuerpo, si tu rodilla está sobre tu pie, si tus hombros están nivelados.\n\nIntenta cambiar tu diálogo interno frente al espejo. En vez de "me veo mal haciendo esto", prueba "mi rodilla necesita ir más sobre mi pie" o "mis hombros están subiendo, los relajo."\n\nUsa el espejo como información, no como juicio. Es tu aliado técnico.',
'brain'),

(31, 'fortalecimiento', 'Equilibrio: la habilidad que se entrena',
E'El equilibrio no es un don natural — es una habilidad que se desarrolla. Si sientes que te tambaleas en relevé o en retiré, es normal. Se mejora con práctica específica.\n\n1. **Árbol (tree pose):** de pie, apoya un pie en la pantorrilla opuesta (no en la rodilla). 30 segundos cada lado. Fija la mirada en un punto.\n\n2. **Tandem walk:** camina poniendo un pie directamente delante del otro, talón contra punta. 10 pasos. Es más difícil de lo que parece.\n\n3. **Un pie con ojos cerrados:** párate en un pie y cierra los ojos. Intenta 10 segundos. Este ejercicio entrena la propiocepción (la capacidad de tu cuerpo de saber dónde está sin verlo).\n\nHaz estos 3 ejercicios diario y en 2 semanas notarás la diferencia en clase.',
'dumbbell'),

(32, 'salud', 'La importancia del calentamiento',
E'Nunca hagas un grand plié en frío. El calentamiento no es opcional — es protección.\n\nUn músculo frío es como una liga refrigerada: rígida y propensa a romperse. Un músculo caliente es elástico y responde mejor.\n\nSi llegas tarde a clase y ya empezaron la barra, haz esto antes de unirte: 30 segundos de marcha en el lugar, 10 sentadillas suaves, círculos de tobillos y caderas, 10 relevés lentos.\n\nEn casa, antes de hacer cualquier estiramiento o ejercicio de este contenido, calienta primero. 5 minutos de caminata rápida o marcha en el lugar son suficientes.\n\nTu cuerpo adulto necesita más calentamiento que el de una niña. Respétalo.',
'heart-pulse'),

(33, 'cultura_ballet', 'Cascanueces: el ballet que conquistó la Navidad',
E'Cada diciembre, teatros de todo el mundo presentan El Cascanueces. Es el ballet más visto del planeta.\n\nLa música es de Tchaikovsky (el mismo de El Lago de los Cisnes). La historia: la niña Clara recibe un cascanueces de regalo en Nochebuena. Por la noche cobra vida, lucha contra el Rey Ratón, y lleva a Clara a un reino mágico donde bailan el Hada de Azúcar, la Danza Árabe, la Danza China y el famoso Vals de las Flores.\n\n**Dato curioso:** cuando se estrenó en 1892 en San Petersburgo, fue un fracaso de crítica. Los críticos dijeron que era "demasiado simple." Hoy es la obra que mantiene financieramente a la mayoría de compañías de ballet del mundo.\n\nBúscalo en YouTube: la versión del Bolshoi es espectacular.',
'ballet-shoe'),

(34, 'estiramiento', 'Cuello y trapecio: libera la tensión acumulada',
E'El cuello y los trapecios cargan la tensión de todo el día: computadora, celular, estrés. Si llegas a clase con nudos en el cuello, tu port de bras sufre.\n\n1. **Inclinación lateral:** inclina la oreja hacia el hombro (sin subir el hombro). Mano opuesta hacia el piso. 20 segundos cada lado.\n\n2. **Rotación suave:** gira la cabeza lentamente de un lado al otro. No hagas círculos completos — eso fuerza las vértebras cervicales. Solo rotaciones laterales.\n\n3. **Estiramiento de trapecio:** mano derecha sobre la cabeza, tira suavemente hacia la derecha mientras el brazo izquierdo baja activamente. 20 segundos.\n\n4. **Hombros a las orejas:** súbelos todo lo que puedas, mantén 5 segundos, suelta de golpe. Repite 5 veces.\n\nHaz esto antes de clase. Llegarás con los hombros relajados y la cabeza lista.',
'stretch'),

(35, 'bienestar_mental', 'Celebra las pequeñas victorias',
E'En ballet, los grandes logros tardan meses o años. Si solo esperas el momento de "hacer una pirueta perfecta" para sentirte satisfecha, vas a esperar mucho.\n\nLas pequeñas victorias son las que importan: hoy mantuve el equilibrio 2 segundos más. Hoy recordé la combinación completa. Hoy no subí los hombros en el plié. Hoy me animé a hacer el ejercicio de centro sin miedo.\n\nAnota una pequeña victoria después de cada clase (puedes usar tu diario en la app). Con el tiempo verás que cada semana hubo algo positivo, aunque no lo sintieras en el momento.\n\nEl progreso es invisible día a día, pero obvio mes a mes.',
'brain'),

(36, 'fortalecimiento', 'Aductores: los músculos del en dehors',
E'Los aductores (interior del muslo) trabajan junto con los glúteos para crear la rotación externa del ballet. Fortalecerlos mejora tu primera posición y tu control en general.\n\n1. **Squeeze con pelota:** acostada boca arriba, rodillas dobladas, aprieta una pelota o almohada entre las rodillas. 3 series de 15.\n\n2. **Side lying adduction:** acostada de lado, pierna de arriba doblada al frente. Sube y baja la pierna de abajo sin tocar el piso. 3 series de 12 cada lado.\n\n3. **Sumo squat:** pies muy separados, puntas hacia afuera (como un gran plié). Baja y sube. 3 series de 10.\n\nEstos músculos suelen ser débiles en personas que pasan mucho tiempo sentadas. Dos semanas de ejercicios consistentes y sentirás la diferencia en la barra.',
'dumbbell'),

(37, 'salud', 'Hidratación: más allá de tomar agua en clase',
E'Llegar deshidratada a clase afecta tu rendimiento más de lo que crees. Los músculos deshidratados se contracturan, las articulaciones se sienten rígidas y la concentración baja.\n\nLa hidratación empieza en la mañana, no cuando llegas al estudio.\n\n**Objetivo diario:** aproximadamente 2 litros de agua. Si tomas café, suma un vaso extra por cada taza.\n\n**Antes de clase (2 horas):** toma 500ml de agua.\n\n**Durante clase:** sorbos pequeños en las pausas. No tomes grandes cantidades de golpe.\n\n**Después de clase:** otros 500ml en la siguiente hora.\n\n**Señales de deshidratación:** orina oscura, dolor de cabeza, calambres frecuentes, cansancio inusual.\n\nTruco: llena tu botella en la mañana y proponte terminarla antes de las 2 PM.',
'heart-pulse'),

(38, 'cultura_ballet', '¿Qué es el método Vaganova?',
E'Cuando tu profesora menciona "Vaganova" se refiere al método de enseñanza de ballet más influyente del mundo.\n\nAgrippina Vaganova (1879-1951) fue bailarina del Ballet Imperial Ruso. Cuando se retiró, se dedicó a enseñar y desarrolló un sistema pedagógico que revolucionó la forma de enseñar ballet.\n\nSu método se basa en: progresión lógica (cada ejercicio prepara para el siguiente), uso armónico del cuerpo completo (no solo las piernas), y énfasis en la expresividad.\n\nAntes de Vaganova, la enseñanza del ballet era caótica — cada maestro enseñaba como quería. Ella lo sistematizó en un libro: "Fundamentos de la Danza Clásica" (1934), que sigue siendo el texto de referencia en academias de todo el mundo.\n\nStudio Dancers sigue este método adaptado a alumnas adultas.',
'ballet-shoe'),

(39, 'estiramiento', 'Rutina completa de 10 minutos post-clase',
E'Si solo puedes hacer una rutina de estiramiento, que sea esta. Cubre las zonas más exigidas en una clase de ballet.\n\n1. Pantorrillas en pared: 30 seg cada lado.\n2. Isquiotibiales sentada: 30 seg.\n3. Mariposa (caderas): 30 seg.\n4. Pigeon stretch (caderas profundo): 30 seg cada lado.\n5. Cuádriceps de pie: 30 seg cada lado. Agarra tu tobillo detrás y lleva el talón al glúteo.\n6. Gato-vaca (espalda): 10 repeticiones.\n7. Torsión acostada (espalda baja): 30 seg cada lado.\n8. Cuello lateral: 20 seg cada lado.\n\nTotal: 10 minutos. Hazla después de cada clase mientras el cuerpo esté caliente. Es cuando más ganancia de flexibilidad obtienes.',
'stretch'),

(40, 'bienestar_mental', 'No necesitas ser flexible para hacer ballet',
E'"Pero yo no soy flexible" es la frase que más escuchamos de adultas que quieren empezar. Y es exactamente al revés: haces ballet para volverte flexible, no al revés.\n\nLa flexibilidad no es un requisito — es un resultado. Nadie nace haciendo split. Las bailarinas profesionales que ves en videos llevan años de trabajo diario. Tú vas a mejorar tu flexibilidad haciendo clase regularmente, sin forzar.\n\nAdemás, la flexibilidad es solo UNA parte del ballet. La postura, la musicalidad, la coordinación, la elegancia del movimiento — todo eso se puede desarrollar independientemente de cuánto se abran tus piernas.\n\nVen como estás. El ballet se adapta a tu cuerpo, no al revés.',
'brain'),

(41, 'fortalecimiento', 'Brazos con tono: sin pesas, con gracia',
E'Los brazos en ballet se ven ligeros pero mantenerlos en posición requiere resistencia muscular. Si tus brazos tiemblan o se caen durante la clase, necesitan fortalecimiento.\n\n1. **Port de bras con botellas de agua:** toma dos botellas de 500ml. Haz las posiciones de brazos (preparatoria, primera, segunda, tercera) y mantén cada una 10 segundos. Repite 3 veces.\n\n2. **Arm circles pequeños:** brazos extendidos a los lados, haz círculos pequeños. 30 segundos hacia adelante, 30 hacia atrás. Parece fácil hasta los 20 segundos.\n\n3. **Plancha lateral:** apoyada en un antebrazo, cuerpo recto. 15 segundos cada lado. Esto trabaja toda la cadena lateral incluyendo los hombros.\n\nEl objetivo no es tener brazos musculosos sino brazos con tono suficiente para mantener las posiciones con gracia, sin esfuerzo visible.',
'dumbbell'),

(42, 'cultura_ballet', 'Giselle: el ballet que te hará llorar',
E'Si El Lago de los Cisnes es el ballet más famoso, Giselle es el más emotivo.\n\nEstrenado en París en 1841, cuenta la historia de Giselle, una campesina que muere de pena al descubrir que el hombre que ama es un príncipe comprometido con otra. En el segundo acto, Giselle regresa como un espíritu (una Wili) y protege al príncipe de las demás Wilis que quieren hacerlo bailar hasta la muerte.\n\nEl primer acto es brillante y alegre. El segundo acto es etéreo, casi irreal — las bailarinas se mueven como si flotaran.\n\nGiselle es especial porque exige tanto técnica como actuación. Una bailarina puede ser técnicamente perfecta pero si no te hace sentir la tragedia de Giselle, no funciona.\n\nVersión recomendada: Natalia Osipova con el Royal Ballet.',
'ballet-shoe'),

(43, 'estiramiento', 'Flexibilidad de tobillos: la llave del plié profundo',
E'Si sientes que no puedes bajar más en plié o que los talones se despegan en grand plié, probablemente tus tobillos necesitan más movilidad.\n\n1. **Sentadilla profunda sostenida:** baja lo más que puedas con talones en el piso. Si no llegas, pon un libro bajo los talones. Mantén 30 segundos.\n\n2. **Rodilla a la pared:** de pie frente a una pared, un pie adelante. Lleva la rodilla a tocar la pared sin despegar el talón. Aleja el pie cada vez más. 10 repeticiones cada lado.\n\n3. **Círculos de tobillo con resistencia:** cruza una pierna sobre la otra y haz círculos amplios y lentos. 10 en cada dirección.\n\nLa movilidad de tobillo se mejora rápido si la trabajas diario. En 3 semanas notarás que tu plié es más cómodo.',
'stretch'),

(44, 'salud', 'Sueño y recuperación: tu cuerpo se repara de noche',
E'El progreso en ballet no ocurre solo en clase. Ocurre mientras duermes.\n\nDurante el sueño profundo tu cuerpo repara microlesiones musculares, consolida la memoria muscular (las secuencias que practicaste) y libera hormona de crecimiento que regenera tejidos.\n\nSi duermes poco, tu cuerpo no se recupera. Llegas a la siguiente clase más cansada, con músculos más rígidos y menor capacidad de concentración.\n\n**Recomendaciones:**\n- 7-8 horas de sueño.\n- Evita pantallas 30 minutos antes de dormir.\n- Si tu clase es por la noche, haz los estiramientos de enfriamiento antes de acostarte para que tu cuerpo baje la activación.\n\nUna buena noche de sueño después de clase vale más que cualquier suplemento.',
'heart-pulse'),

(45, 'fortalecimiento', 'Circuito express: 7 minutos antes de clase',
E'Si llegas temprano al estudio, usa esos minutos para activar tu cuerpo antes de que empiece la clase.\n\n1. Marcha en el lugar: 1 minuto. Sube las rodillas.\n2. Sentadillas: 10 repeticiones.\n3. Relevés: 10 repeticiones.\n4. Lunges alternados: 5 cada pierna.\n5. Círculos de caderas: 5 en cada dirección.\n6. Círculos de tobillos: 5 en cada dirección cada pie.\n7. Hombros arriba-abajo: 10 repeticiones.\n\nEn 7 minutos tu cuerpo pasa de "acabo de salir de la oficina" a "estoy lista para bailar." La profesora empieza la barra y tú ya estás activada.',
'dumbbell'),

(46, 'cultura_ballet', '¿Por qué usamos zapatillas de media punta?',
E'Las zapatillas de media punta (también llamadas soft shoes o demi-pointe) son de tela o cuero suave, con una suela fina que te permite sentir el piso.\n\nNo son zapatos normales. Están diseñadas para que tu pie trabaje: los músculos de la planta, los dedos, el empeine. Un zapato deportivo hace el trabajo por ti; la zapatilla de ballet te obliga a ti a hacerlo.\n\nPor eso al principio los pies duelen o se cansan rápido. Están trabajando músculos que nunca habían trabajado así.\n\n**Consejos de cuidado:** déjalas secar al aire después de clase (nunca en bolsa cerrada). Lavalas a mano si es necesario. Reemplázalas cuando la suela se adelgace tanto que resbales.\n\nLas zapatillas de punta (duras, para bailar en punta) son otro nivel completamente diferente y requieren años de preparación.',
'ballet-shoe'),

(47, 'bienestar_mental', 'El ballet después de los 30, 40, 50...',
E'No existe una fecha de vencimiento para empezar ballet. El cuerpo humano puede aprender movimientos nuevos a cualquier edad.\n\n**A los 30:** tienes fuerza y energía. Tu cuerpo responde rápido. La coordinación mejora rápidamente.\n\n**A los 40:** la flexibilidad tarda más pero la conciencia corporal es mayor. Entiendes las instrucciones más rápido que una niña de 8 años.\n\n**A los 50+:** el equilibrio y la movilidad articular son los mayores beneficios. El ballet literalmente previene caídas y mantiene la densidad ósea.\n\nLo que cambia con la edad no es la capacidad de aprender sino la velocidad de recuperación. Por eso calentamos más, estiramos más, y respetamos los límites del cuerpo.\n\nEstás en el lugar correcto, en el momento correcto. Tu edad no es una limitación — es tu fortaleza.',
'brain'),

(48, 'salud', 'Cuándo NO debes ir a clase',
E'A veces la mejor decisión es quedarte en casa. Estas son señales de que es mejor descansar:\n\n**Fiebre:** cualquier grado de fiebre. Tu cuerpo está luchando contra algo; no le añadas esfuerzo físico.\n\n**Dolor articular agudo:** si una articulación duele en reposo, no la exijas en clase.\n\n**Mareo o vértigo:** el equilibrio es fundamental en ballet. Si estás mareada, es peligroso.\n\n**Lesión reciente:** si te torciste un tobillo o te duele la espalda, consulta antes de volver.\n\n**Agotamiento extremo:** hay una diferencia entre cansancio normal y agotamiento. Si no dormiste, estás enferma o emocionalmente agotada, un día de descanso te hace más bien que una clase a medias.\n\nRecuerda: faltar una clase no es perder el progreso. Forzar tu cuerpo enfermo o lesionado sí puede hacerte retroceder semanas.',
'heart-pulse')
ON CONFLICT (orden) DO NOTHING;


-- ============================================================
-- TABLE 2: retos_semanales (48 rows)
-- ============================================================

INSERT INTO retos_semanales (orden, categoria, titulo, descripcion, tip_extra) VALUES
(1, 'fuerza', 'Relevé mientras esperas',
E'Cada vez que estés en una fila (supermercado, banco, cualquier lugar), ponte en relevé y aguanta 10 segundos. Repite 3 veces.',
E'Mantén el peso sobre los tres primeros dedos, no solo el gordo.'),

(2, 'conciencia_corporal', 'Postura en el semáforo',
E'Cada vez que te detengas en un semáforo (en el carro o caminando), verifica tu postura: hombros abajo, espalda larga, cabeza como si un hilo te jalara hacia arriba.',
E'Imagina que llevas una corona. Esa imagen cambia instantáneamente tu postura.'),

(3, 'flexibilidad', 'Mariposa antes de dormir',
E'Sentada en la cama antes de dormir, junta las plantas de los pies y deja caer las rodillas. Respira profundo 10 veces. Sin empujar, solo dejar que la gravedad haga su trabajo.',
E'Cierra los ojos y enfócate solo en la respiración. 2 minutos bastan.'),

(4, 'musicalidad', 'Escucha un ballet completo',
E'Busca en Spotify o YouTube el Lago de los Cisnes de Tchaikovsky. Escucha 10 minutos mientras haces otra cosa. Identifica los momentos lentos (adagio) y los rápidos (allegro).',
E'Nota cómo la música cambia de carácter. Eso es lo que la profesora escucha cuando elige música para clase.'),

(5, 'fuerza', 'Pliés mientras hierve el agua',
E'Mientras esperas que hierva el agua para el café o la cena, haz 10 demi-pliés lentos en primera posición. Usa la encimera como barra.',
E'Baja en 4 tiempos, sube en 4 tiempos. Espalda completamente recta.'),

(6, 'equilibrio', 'Lavar los dientes en un pie',
E'Mañana y noche, lava tus dientes parada en un solo pie. Cambia de pie a la mitad. Son 2 minutos de equilibrio gratis al día.',
E'Si es muy fácil, cierra los ojos 10 segundos. La dificultad sube drásticamente.'),

(7, 'conciencia_corporal', 'Camina con intención',
E'Hoy, cada vez que camines (a la oficina, al baño, al carro), hazlo como si estuvieras en el escenario: cabeza alta, pasos con propósito, pies articulados.',
E'Nota la diferencia entre caminar "por caminar" y caminar con presencia. Es la misma diferencia que hay en ballet.'),

(8, 'flexibilidad', 'Estiramiento de pared',
E'Pon los dos pies juntos contra una pared mientras estás acostada boca arriba. Abre las piernas como una V y deja que la gravedad las abra. 2 minutos.',
E'Pon música relajante. Esto estira aductores e isquiotibiales sin esfuerzo.'),

(9, 'fuerza', 'Plancha de 30 segundos',
E'Una sola plancha de 30 segundos hoy. Cuerpo recto, abdomen apretado, respirando normalmente. Si aguantas más, sigue hasta donde puedas.',
E'Mira un punto en el piso entre tus manos. Si levantas la cabeza, la espalda se hunde.'),

(10, 'musicalidad', 'Cuenta los tiempos',
E'Pon cualquier canción y cuenta los tiempos musicales: 1-2-3-4, 1-2-3-4. Cuando puedas, intenta contar en frases de 8: 1-2-3-4-5-6-7-8.',
E'En ballet casi todo se cuenta en frases de 8. Cuando lo hagas automáticamente con la música, la clase se vuelve más fácil.'),

(11, 'equilibrio', 'Retiré en la cocina',
E'Mientras cocinas o esperas algo, sube un pie a la pantorrilla opuesta (posición de retiré o passé). Mantén 15 segundos cada lado.',
E'No apoyes la mano en la encimera a menos que realmente lo necesites. Déjala cerca pero intenta sin apoyo.'),

(12, 'conciencia_corporal', 'Escaneo corporal de 1 minuto',
E'Sentada o acostada, cierra los ojos y recorre tu cuerpo mentalmente de pies a cabeza. Nota dónde hay tensión. No intentes cambiarla, solo obsérvala.',
E'Hazlo justo antes de dormir. Llevarás esa conciencia corporal a tu próxima clase.'),

(13, 'fuerza', '10 relevés en cada pie',
E'De pie al lado de una pared, sube a media punta en un solo pie. 10 repeticiones cada lado. Lento: 2 tiempos arriba, 2 tiempos abajo.',
E'Si tambaleas, toca la pared con un dedo. El objetivo es necesitar cada vez menos apoyo.'),

(14, 'flexibilidad', 'Flexiona y apunta 20 veces',
E'Sentada con las piernas estiradas, alterna entre flex (pie hacia ti) y point (pie estirado). 20 repeticiones. Lento y con control.',
E'Intenta separar el movimiento: primero estira los dedos, luego el empeine. Son dos movimientos, no uno.'),

(15, 'musicalidad', 'Vals en tu sala',
E'Pon un vals (busca ''waltz music'' en YouTube) y simplemente camina por tu sala siguiendo el 1-2-3, 1-2-3. No necesitas hacer nada elaborado — solo sentir el compás ternario.',
E'El tiempo 1 siempre es el fuerte. Pisa más firme en el 1 y más suave en el 2 y 3.'),

(16, 'fuerza', 'Sentadilla de pared',
E'Espalda contra la pared, baja hasta que los muslos estén paralelos al piso. Mantén 30 segundos. Es como un plié estático infinito.',
E'Si 30 segundos es mucho, empieza con 15 y ve subiendo. Las piernas temblarán — eso es normal.'),

(17, 'equilibrio', 'Caminar en línea recta',
E'En tu casa, camina 10 pasos poniendo un pie directamente delante del otro (talón contra punta). Ida y vuelta.',
E'Mira un punto fijo al frente, no tus pies. El equilibrio viene de la mirada.'),

(18, 'conciencia_corporal', 'Hombros: arríbalos y suéltalos',
E'3 veces durante el día: sube los hombros a las orejas, aprieta 5 segundos, y suéltalos de golpe. Nota la diferencia entre tenso y relajado.',
E'Hazlo en la oficina, en el carro, antes de clase. Es el reset más rápido para hombros tensos.'),

(19, 'fuerza', 'Puente de glúteos x 20',
E'Acostada boca arriba, pies en el piso, sube la cadera apretando glúteos. 20 repeticiones. Si quieres más reto, hazlo con una pierna.',
E'Arriba aprieta 2 segundos antes de bajar. Siente cómo trabaja el glúteo, no la espalda baja.'),

(20, 'flexibilidad', '90 segundos de pigeon pose',
E'Desde posición de cuatro puntos, lleva una rodilla hacia adelante y extiende la pierna de atrás. 45 segundos cada lado.',
E'Si duele la rodilla del frente, no bajes tanto. Con el tiempo irás ganando rango.'),

(21, 'musicalidad', 'Adagio en el celular',
E'Busca ''adagio ballet class music'' en YouTube. Pon 5 minutos y simplemente haz movimientos de brazos lentos siguiendo la música. Port de bras libre.',
E'No pienses en hacerlo "bien." Solo mueve los brazos con la música y disfruta la sensación.'),

(22, 'equilibrio', 'Ojos cerrados, un pie',
E'Parada en un pie, cierra los ojos. Cuenta cuántos segundos aguantas. Anótalo. La semana que viene inténtalo de nuevo y compara.',
E'Lo normal para principiantes es 5-10 segundos. Si llegas a 15, tu propiocepción está mejorando muchísimo.'),

(23, 'fuerza', 'Elevaciones de pierna lateral',
E'Acostada de lado, sube la pierna de arriba 15 veces sin mover la cadera. 3 series cada lado. Trabaja abductores y estabilidad.',
E'No subas demasiado alto. La calidad es más importante que la altura. Piensa en longitud, no en altura.'),

(24, 'conciencia_corporal', 'La prueba del espejo',
E'Párate frente a un espejo de cuerpo entero y observa tu postura natural. ¿Un hombro más alto? ¿Cadera inclinada? ¿Cabeza adelantada? Solo observa, sin juzgar.',
E'Esto te ayuda a entender qué le está pidiendo tu profesora cuando dice ''alinea''. Todos tenemos asimetrías.'),

(25, 'flexibilidad', 'Estiramiento de puerta',
E'Pon un antebrazo en el marco de la puerta y da un paso adelante. Siente la apertura en el pecho. 30 segundos cada lado.',
E'Prueba con el brazo más alto y más bajo para estirar diferentes fibras del pectoral.'),

(26, 'fuerza', 'Dead bugs: 10 cada lado',
E'Acostada boca arriba, brazos al techo, rodillas en 90°. Extiende brazo derecho y pierna izquierda sin despegar la espalda baja. 10 cada lado.',
E'Si la espalda baja se despega del piso, no estás activando el core. Reduce el rango hasta que puedas mantenerla pegada.'),

(27, 'musicalidad', 'Identifica los instrumentos',
E'Pon cualquier pieza de ballet y enfócate en un solo instrumento: ¿dónde está el piano? ¿Y los violines? ¿Y la flauta? Escucha 5 minutos.',
E'Cada instrumento tiene un "papel" en la música de ballet. Los violines suelen ser la melodía, el piano da la estructura rítmica.'),

(28, 'equilibrio', 'Relevé con libro en la cabeza',
E'Pon un libro liviano en tu cabeza e intenta subir a relevé sin que se caiga. 5 intentos.',
E'Esto te obliga a mantener la cabeza quieta y alineada. Si se cae, tu cabeza se está moviendo.'),

(29, 'conciencia_corporal', 'Respira con el diafragma',
E'Acostada, pon una mano en el pecho y otra en el abdomen. Respira de forma que solo se mueva la mano del abdomen. 10 respiraciones.',
E'Esta es la respiración correcta para ballet. El pecho no sube; el abdomen se expande lateralmente.'),

(30, 'fuerza', 'Clamshells x 15 cada lado',
E'Acostada de lado, rodillas dobladas, abre la rodilla de arriba sin mover la cadera. Como una almeja que se abre. 15 cada lado.',
E'Pon la mano en el glúteo para sentir que trabaja. Si no lo sientes, probablemente estás moviendo la cadera.'),

(31, 'flexibilidad', 'Estiramiento de cuádriceps de pie',
E'De pie, agarra un tobillo detrás y lleva el talón al glúteo. Rodillas juntas. 30 segundos cada lado. Usa una pared si necesitas equilibrio.',
E'Empuja la cadera ligeramente hacia adelante para profundizar el estiramiento.'),

(32, 'musicalidad', 'Mueve los brazos con una canción',
E'Pon tu canción favorita (no tiene que ser clásica) y mueve SOLO los brazos siguiendo la música. Sin mover los pies. 3 minutos.',
E'Esto entrena la disociación: mover una parte del cuerpo independientemente de otra. Es fundamental en ballet.'),

(33, 'fuerza', 'Sentadillas sumo x 15',
E'Pies muy separados, puntas hacia afuera (como gran plié). Baja y sube 15 veces. Espalda recta, rodillas sobre los dedos del pie.',
E'Mantén 3 segundos abajo en la última repetición. Siente los aductores y glúteos trabajando.'),

(34, 'equilibrio', 'Arabesque en la pared',
E'De pie frente a una pared (manos en la pared), levanta una pierna atrás manteniendo la cadera cuadrada. 15 segundos cada lado.',
E'No importa qué tan alto sube la pierna. Importa que la cadera NO se abra. Cuadrada siempre.'),

(35, 'conciencia_corporal', 'Nota tus pies al caminar',
E'Hoy, presta atención a cómo caminan tus pies: ¿pisas más con un lado? ¿Arrastras los pies? ¿Articulas del talón a la punta?',
E'En ballet caminamos punta-talón (al revés de lo normal). Notar cómo caminas normalmente te ayuda a entender la diferencia.'),

(36, 'flexibilidad', 'Torsión sentada',
E'Sentada en el piso, cruza una pierna sobre la otra y gira el torso hacia el lado de la pierna cruzada. 30 segundos cada lado.',
E'Crece hacia arriba antes de girar. La espalda larga gira más y mejor.'),

(37, 'fuerza', 'Superman x 10',
E'Acostada boca abajo, levanta brazos y piernas del piso simultáneamente. 3 segundos arriba, baja. 10 repeticiones.',
E'No mires al frente (fuerza el cuello). Mira al piso y mantén el cuello neutro.'),

(38, 'musicalidad', 'Busca El Cascanueces',
E'Busca ''Nutcracker Suite Tchaikovsky'' y escucha la Danza del Hada de Azúcar (2 min). Nota el instrumento principal: se llama celesta y suena como campanas mágicas.',
E'Tchaikovsky fue el primer compositor en usar la celesta en una orquesta. La mandó a traer de París en secreto.'),

(39, 'equilibrio', 'Camina hacia atrás',
E'En un pasillo de tu casa, camina 10 pasos hacia atrás con control. Punta primero, luego talón. Lento.',
E'En ballet hay muchos pasos que van hacia atrás. Tu cuerpo necesita sentirse cómodo retrocediendo.'),

(40, 'conciencia_corporal', 'Activa tu core sentada',
E'Donde estés sentada ahora, sepárate del respaldo. Crece desde la columna. Siente cómo se activa el abdomen profundo. Mantén 30 segundos.',
E'Esto es exactamente lo que tu profesora pide cuando dice ''activa el centro''. Practícalo fuera de clase.'),

(41, 'fuerza', 'Lunges lentos x 10',
E'Da un paso largo al frente, baja la rodilla trasera casi al piso. 10 cada pierna. Lento: 3 tiempos bajando, 3 subiendo.',
E'Mantén el torso completamente vertical. Si te inclinas al frente, el paso es demasiado largo.'),

(42, 'flexibilidad', 'Child''s pose de 2 minutos',
E'De rodillas, baja el torso al piso con los brazos extendidos. Respira profundo durante 2 minutos completos. Deja que la espalda baja se abra.',
E'Si las rodillas molestan, pon una almohada entre los glúteos y las pantorrillas.'),

(43, 'musicalidad', 'Palmea el ritmo de una canción',
E'Pon cualquier canción y palmea cada tiempo fuerte. Luego intenta palmear solo los tiempos 1 y 3 (no el 2 y 4).',
E'La mayoría de la gente palmea en 2 y 4 instintivamente (como en pop). Ballet cuenta en 1 y 3. Nota la diferencia.'),

(44, 'equilibrio', 'Relevé con giro de cabeza',
E'En relevé (dos pies), gira la cabeza lentamente de un lado al otro sin perder el equilibrio. 5 giros completos.',
E'Esto prepara tu cuerpo para los giros: mantener el equilibrio mientras la cabeza se mueve es la base del spotting.'),

(45, 'fuerza', 'Plancha lateral 15 seg cada lado',
E'Apoyada en un antebrazo, cuerpo en línea recta. 15 segundos cada lado. Trabaja los oblicuos que estabilizan tu torso en ballet.',
E'Si 15 es mucho, apoya también la rodilla de abajo. Lo importante es que la cadera no se hunda.'),

(46, 'conciencia_corporal', 'Pies descalzos 10 minutos',
E'Camina descalza por tu casa durante 10 minutos. Siente la textura del piso. Nota cómo tus pies se ajustan naturalmente.',
E'En ballet trabajamos descalzas o con zapatilla mínima. Tus pies necesitan reconectar con el piso.'),

(47, 'flexibilidad', 'Estiramiento de gato-vaca',
E'En cuatro puntos, alterna entre arquear la espalda (gato) y hundirla (vaca). 10 repeticiones coordinando con la respiración.',
E'Inhala en vaca (espalda cóncava), exhala en gato (espalda convexa). Es el mejor ejercicio para la columna.'),

(48, 'musicalidad', 'Cierra los ojos y siente',
E'Pon 5 minutos de música de ballet. Cierra los ojos. No cuentes, no analices. Solo siente cómo te hace mover por dentro. Déjate llevar.',
E'Esto es lo que tu profesora quiere cuando dice ''siente la música''. No es pensar — es sentir.')
ON CONFLICT (orden) DO NOTHING;
