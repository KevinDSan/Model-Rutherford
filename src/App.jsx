// Importaciones necesarias
  import React, { useState, useRef, useEffect } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';
  import { Plus, Minus, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
  import epico from './assets/epico.jpeg';
  import './index.css';

  // Datos atómicos reales para materiales
const atomData = {
  Gold:    { protons: 79, neutrons: 118},
  Silver:  { protons: 47, neutrons: 61 },
  Copper:  { protons: 29, neutrons: 35},
};

  export default function App() {
    // Estados principales de configuración
    const [showTraces, setShowTraces] = useState(true);
    const [alphaParticles, setAlphaParticles] = useState(5);
    const [targetNucleus, setTargetNucleus] = useState('Gold');
    const [energy, setEnergy] = useState(50);
    const [showModal, setShowModal] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [layout, setLayout] = useState('single');
    const [generating, setGenerating] = useState(false);
    const [atomInfo, setAtomInfo] = useState(atomData[targetNucleus]);
    const [showStatsCard, setShowStatsCard] = useState(true);
    const [showMaterialCard, setShowMaterialCard] = useState(true);


    const [speed, setSpeed] = useState(3); // velocidad por defecto
    const [spawnOrigin, setSpawnOrigin] = useState('left'); // origen por defecto
    const frameCounter = useRef(0); // <- necesario para controlar la frecuencia de generación
    
    const [particlesGenerated, setParticlesGenerated] = useState(0); // Particulas generadas.
    const [particlesRebounded, setParticlesRebounded] = useState(0); //Particulas rebotadas.
    const [particlesDeflected, setParticlesDeflected] = useState(0); //Particulas desviadas

    // Referencias para canvas y simulación
    const canvasRef = useRef();
    const particles = useRef([]);
    const requestRef = useRef();
    const generationIntervalRef = useRef(null);
    const colores = ['#ff6666', '#66ccff', '#ccff66', '#ffcc66'];

    // Controlar generación continua de partículas
  const toggleGenerating = () => {
    setGenerating(prev => !prev);
    };

    // Radio del campo de dispersión
  const getFieldRadius = () => 80 + (energy * 1.5);

    // Obtener colores según material del núcleo
  const getNucleusColors = () => {
      switch (targetNucleus) {
        case 'Gold': return ['bg-yellow-400', 'bg-yellow-600'];
        case 'Silver': return ['bg-gray-300', 'bg-gray-500'];
        case 'Copper': return ['bg-orange-400', 'bg-orange-600'];
        default: return ['bg-white', 'bg-white'];
      }
    };

    // Generar estructura circular para representar núcleo
  const generateCircularNucleus = () => {
      const particles = [];
      const radii = [0, 12, 24];
      const colors = getNucleusColors();
      radii.forEach((radius, layerIndex) => {
        const count = layerIndex === 0 ? 1 : layerIndex === 1 ? 6 : 12;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * 2 * Math.PI;
          const x = Math.cos(angle) * radius - 8;
          const y = Math.sin(angle) * radius - 8;
          const color = colors[(i + layerIndex) % 2];
          particles.push({ x, y, color });
        }
      });
      return particles;
    };

    // Generar posiciones de núcleos según distribución seleccionada
  const generateNucleusPositions = () => {
      const positions = [];
      const spacingX = 160;
      const spacingY = 140;

      if (layout === 'grid') {
        const cols = 7;
        const rows = 5;
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const offsetX = row % 2 !== 0 ? spacingX / 2 : 0;
            positions.push({
              x: (col * spacingX) - ((cols - 1) * spacingX) / 2 + offsetX,
              y: (row * spacingY) - ((rows - 1) * spacingY) / 2
            });
          }
        }
      } else if (layout === 'square') {
        const cols = 3;
        const rows = 3;
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = col * spacingX - ((cols - 1) * spacingX) / 2;
            const y = row * spacingY - ((rows - 1) * spacingY) / 2;
            positions.push({ x, y });
          }
        }
      } else if (layout === 'single') {
        positions.push({ x: 0, y: 0 });
      } else {
        const coords = [
          { x: -240, y: -140 }, { x: -80, y: -140 }, { x: 80, y: -140 }, { x: 240, y: -140 },
          { x: -160, y: 0 }, { x: 0, y: 0 }, { x: 160, y: 0 },
          { x: -240, y: 140 }, { x: -80, y: 140 }, { x: 80, y: 140 }, { x: 240, y: 140 },
          { x: -160, y: 280 }, { x: 0, y: 280 }, { x: 160, y: 280 }
        ];
        coords.forEach(p => positions.push(p));
      }
      return positions;
    };
    const nucleusPositions = generateNucleusPositions();

    // Generar conjunto de partículas según origen
  const generarParticulas = () => {
    const nuevas = [];
    const canvas = canvasRef.current;

    for (let i = 0; i < alphaParticles; i++) {
      let color;
      if (speed <= 3) {
        color = '#66ccff'; // azul → velocidad baja
      } else if (speed <= 7) {
        color = '#ffcc66'; // amarillo → velocidad media
      } else {
        color = '#ff6666'; // rojo → velocidad alta
      }

      let x, y, vx = 0, vy = 0;

      switch (spawnOrigin) {
        case 'left':
          x = 0;
          y = Math.random() * canvas.height;
          vx = speed;
          break;
        case 'right':
          x = canvas.width;
          y = Math.random() * canvas.height;
          vx = -speed;
          break;
        case 'top':
          x = Math.random() * canvas.width;
          y = 0;
          vy = speed;
          break;
        case 'bottom':
          x = Math.random() * canvas.width;
          y = canvas.height;
          vy = -speed;
          break;
        case 'random':
          x = Math.random() * canvas.width;
          y = Math.random() * canvas.height;
          vx = (Math.random() - 0.5) * speed * 2;
          vy = (Math.random() - 0.5) * speed * 2;
          break;
        default:
          x = 0;
          y = Math.random() * canvas.height;
          vx = speed;
          break;
      }

      const angleInicial = Math.atan2(vy, vx);
  nuevas.push({ x, y, vx, vy, color, desviada: false, reboto: false, angleInicial, trail: [] });
  }

  particles.current.push(...nuevas);
  setParticlesGenerated(prev => prev + nuevas.length);
};

const getFieldColor = () => {
    switch (targetNucleus) {
      case 'Gold': return 'bg-yellow-400';
      case 'Silver': return 'bg-gray-300';
      case 'Copper': return 'bg-orange-400';
      default: return 'bg-white';
    }
  };

const resetSimulacion = () => {
  cancelAnimationFrame(requestRef.current);
  particles.current = [];
  setParticlesGenerated(0);
  setParticlesRebounded(0);
  setParticlesDeflected(0);
  const canvas = canvasRef.current;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
};


  // Detectar colisiones con núcleos y campos de energía
 const detectarColision = (p) => {
    for (let nucleo of nucleusPositions) {
      const centerX = canvasRef.current.width / 2 + nucleo.x * zoom;
    const centerY = canvasRef.current.height / 2 + nucleo.y * zoom;

    const dx = centerX - p.x;
    const dy = centerY - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const nextX = p.x + p.vx;
    const nextY = p.y + p.vy;
    const nextDx = centerX - nextX;
    const nextDy = centerY - nextY;
    const nextDist = Math.sqrt(nextDx * nextDx + nextDy * nextDy);

    const coreRadius = 30 * zoom;
    const fieldRadius = getFieldRadius() * zoom;

    // Detecta si va a colisionar en el siguiente frame o ya colisionó
    if ((dist > coreRadius && nextDist < coreRadius) || dist < coreRadius) {
      const normalX = dx / dist;
      const normalY = dy / dist;
      const dot = p.vx * normalX + p.vy * normalY;
      p.vx -= 2 * dot * normalX;
      p.vy -= 2 * dot * normalY;

      // Forzar que salga del núcleo para evitar pegado
      const escapeRadius = coreRadius + 1;
      p.x = centerX - normalX * escapeRadius;
      p.y = centerY - normalY * escapeRadius;

      if (!p.reboto) {
        p.reboto = true;
        setParticlesRebounded(prev => prev + 1);
      }
    }
    // Campo de dispersión por repulsión (ley tipo Coulomb)
  else if (dist < fieldRadius) {
  const k = 200;
  const fuerza = k / (dist * dist + 1);
  const fx = (p.x - centerX) / dist * fuerza;
  const fy = (p.y - centerY) / dist * fuerza;

  p.vx += fx;
  p.vy += fy;

  const angleActual = Math.atan2(p.vy, p.vx);
  const diferencia = Math.abs(angleActual - p.angleInicial);

  // Considera desviada si cambió más de ~10 grados (0.17 rad)
  if (!p.desviada && diferencia > 0.17) {
    p.desviada = true;
    setParticlesDeflected(prev => prev + 1);
      }
    }
  }
};

    // Función principal de dibujo y animación en canvas
  const dibujar = () => {
  const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!showTraces) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)"; // fondo semitransparente para trazo
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Generar partículas automáticamente cada 10 frames
    frameCounter.current++;
    if (generating && frameCounter.current % 10 === 0 && particles.current.length < 300) {
      generarParticulas();
    }

  // Animar y dibujar partículas
    particles.current.forEach(p => {
      detectarColision(p);
      p.x += p.vx;
      p.y += p.vy;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);

    // Color dinámico según velocidad actual
  const velocidad = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    let color;

    if (velocidad <= 3) {
      color = '#66ccff'; // azul: baja velocidad
    } else if (velocidad <= 7) {
      color = '#ffcc66'; // amarilla: media velocidad
    } else {
      color = '#ff6666'; // roja: alta velocidad
    }
    ctx.fillStyle = color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  requestRef.current = requestAnimationFrame(dibujar);
};

    // Inicializar canvas al montar
    useEffect(() => {
      const canvas = canvasRef.current;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }, []);

    useEffect(() => {
  let animationId;

  const loop = () => {
    frameCounter.current++;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Generar nuevas partículas solo si está activado
    if (generating && frameCounter.current % 10 === 0) {
      generarParticulas();
    }

    // Mover y dibujar partículas existentes
    particles.current.forEach(p => {
      detectarColision(p);

      // Trazas
      if (showTraces) {
        if (!p.trail) p.trail = [];
        if (p.trail.length > 30) p.trail.shift();
        p.trail.push({ x: p.x, y: p.y });
      }

      // Mover partícula
      p.x += p.vx;
      p.y += p.vy;

      // Dibujar traza
      if (showTraces && p.trail.length > 1) {
        ctx.beginPath();
        for (let i = 0; i < p.trail.length - 1; i++) {
          ctx.moveTo(p.trail[i].x, p.trail[i].y);
          ctx.lineTo(p.trail[i + 1].x, p.trail[i + 1].y);
        }
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Dibujar partícula
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);

      const velocidad = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      let color;
      if (velocidad <= 3) {
        color = '#66ccff';
      } else if (velocidad <= 7) {
        color = '#ffcc66';
      } else {
        color = '#ff6666';
      }

      ctx.fillStyle = color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.fill();
      ctx.shadowBlur = 0;
      });

      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationId);
  }, [generating, showTraces]);


    useEffect(() => {
      cancelAnimationFrame(requestRef.current);
      particles.current = [];
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }, [layout]);

    useEffect(() => {
      setAtomInfo(atomData[targetNucleus]);
    }, [targetNucleus]);

    useEffect(() => {
      const energiaAuto = atomInfo.protons * 1.25;
      setEnergy(energiaAuto);
    }, [atomInfo]);



  return (
  <div className="min-h-screen bg-gradient-to-br from-[#0d0d0d] via-[#141414] to-[#1a1a1a] text-white font-sans p-10">
    <header className="flex justify-between items-center border-b border-gray-700 pb-5 mb-8">
      <h1 className="text-4xl font-extrabold tracking-tight">Rutherford: Dispersión de Partículas Alfa</h1>
      <button onClick={() => setShowModal(true)} className="text-base tracking-widest text-sky-400 hover:underline hover:text-sky-300 transition">Miembros</button>
    </header>

    <main className="flex gap-8">
      <section className="w-1/3 bg-[#1e1e1e] rounded-2xl p-8 space-y-6 shadow-lg border border-[#333]">
    <div>
    <h2 className="text-lg font-semibold text-white mb-4 text-center">Partículas Alfa</h2>
      <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Cantidad:</label>
        <input
          type="range"
          min="1"
          max="10"
          value={alphaParticles}
          onChange={(e) => setAlphaParticles(e.target.value)}
          className="w-full accent-white"/>
      </div>

      <div>
      <label className="block text-sm font-medium text-gray-400 mb-2">Velocidad:</label>
        <input type="range"
          min="1"
          max="10"
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="w-full accent-white"
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 mt-4">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Origen de Partículas:</label>
        <select
          value={spawnOrigin}
          onChange={(e) => setSpawnOrigin(e.target.value)}
          className="w-full bg-[#2e2e2e] text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500">
          <option value="left">Izquierda</option>
          <option value="right">Derecha</option>
          <option value="top">Arriba</option>
          <option value="bottom">Abajo</option>
        </select>
      </div>

      <div>
  <label className="block text-sm font-medium text-gray-400 mb-2">Trazado:</label>
      <select
      value={showTraces ? "on" : "off"}
      onChange={(e) => setShowTraces(e.target.value === "on")}
      className="w-full bg-[#2e2e2e] text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500">
      <option value="off">Desactivado</option>
      <option value="on">Activado</option>
    </select>
  </div>

    </div>
  </div>
  <div>
  <h2 className="text-lg font-semibold text-white mt-6 mb-4 text-center">Núcleo Átomo</h2>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-2">Material:</label>
      <select
        value={targetNucleus}
        onChange={(e) => setTargetNucleus(e.target.value)}
        className="w-full bg-[#2e2e2e] text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500">
        <option value="Gold">Oro</option>
        <option value="Silver">Plata</option>
        <option value="Copper">Cobre</option>
      </select>
        </div>
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-2">Distribución:</label>
      <select
        value={layout}
        onChange={(e) => setLayout(e.target.value)}
        className="w-full bg-[#2e2e2e] text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500">
        <option value="single">Único</option>
        <option value="square">Cuadrado</option>
        <option value="grid">Red</option>
      </select>
    </div>
    
      </div>
     <div className="mt-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">Energía Repulsiva:</label>
        <input
          type="range"
          min="0"
          max="100"
          value={energy}
          onChange={(e) => setEnergy(e.target.value)}
          className="w-full accent-white"/>
      </div>
    </div>

        <button
      onClick={toggleGenerating}
      className={`w-full mt-6 ${generating ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} transition-colors text-white py-2 rounded-lg font-semibold shadow`}>
      {generating ? 'Pausar Simulación' : 'Iniciar Simulación'}
        </button>

  </section>


      <section className="flex-1 bg-[#1e1e1e] rounded-2xl p-8 flex flex-col items-center justify-center shadow-lg border border-[#333] relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
        />
        <div className="absolute top-4 right-4 bg-[#2e2e2e] px-4 py-2 rounded-lg shadow border border-[#444] flex gap-2 z-10">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} className="text-white bg-gray-700 hover:bg-gray-600 p-2 rounded">
            <Minus size={16} />
          </button>
          <button onClick={() => setZoom((z) => Math.min(2, z + 0.1))} className="text-white bg-gray-700 hover:bg-gray-600 p-2 rounded">
            <Plus size={16} />
          </button>
        </div>
        
        <div className="absolute top-4 left-4 bg-[#2e2e2e] px-4 py-2 rounded-lg shadow border border-[#444] flex gap-2 z-10">
          <button
            onClick={resetSimulacion}
            className="text-white bg-gray-700 hover:bg-gray-600 p-2 rounded"
            title="Reiniciar simulación"
          >
            <RotateCcw size={16} />
          </button>
      </div>

       <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative transform transition-transform duration-300 flex flex-wrap items-center justify-center gap-4" style={{ scale: zoom }}>
        {nucleusPositions.map((pos, index) => (
          <div
            key={index}
            className="absolute"
            style={{
              left: `calc(50% + ${pos.x}px)`,
              top: `calc(50% + ${pos.y}px)`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <motion.div
              className="absolute rounded-full bg-yellow-400 opacity-20 blur-xl"
              style={{
                width: `${getFieldRadius()}px`,
                height: `${getFieldRadius()}px`,
                left: -getFieldRadius() / 2,
                top: -getFieldRadius() / 2,
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.15, 0.25, 0.15],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            <motion.div
            className={`absolute rounded-full ${getFieldColor()} opacity-20 blur-xl`}
            animate={{
              width: `${getFieldRadius()}px`,
              height: `${getFieldRadius()}px`,
              left: -getFieldRadius() / 2,
              top: -getFieldRadius() / 2,
            }}
            transition={{ duration: 0.4 }}
            />


            {generateCircularNucleus().map((p, i) => (
              <div
                key={i}
                className={`absolute w-4 h-4 rounded-full ${p.color}`}
                style={{ transform: `translate(${p.x}px, ${p.y}px)` }}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>

  <div className="absolute bottom-4 left-4">
  <div className="relative w-[250px]">
    <button
  onClick={() => setShowStatsCard(!showStatsCard)}
  className="absolute bottom-4 left-4 bg-gray-700 hover:bg-gray-600 p-2 rounded-lg shadow text-white z-10"
  title={showStatsCard ? 'Ocultar Estadísticas' : 'Mostrar Estadísticas'}
>
  {showStatsCard ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
</button>

    {showStatsCard && (
  <div className="absolute bottom-4 left-6 w-[250px] bg-[#2e2e2e] px-6 py-4 rounded-xl text-center shadow border border-[#444]">
    <p className="text-sm text-gray-400">Estadísticas Párticulas</p>
    <p className="text-sm text-white mt-1">Generadas: {particlesGenerated}</p>
    <p className="text-sm text-white">Rebotadas: {particlesRebounded}</p>
    <p className="text-sm text-white">Dispersadas: {particlesDeflected}</p>
  </div>
)}
  </div>
</div>

<div className="absolute bottom-4 right-4">
  <div className="relative w-[180px]">
  {/* Botón toggle del núcleo (esquina inferior derecha) */}
<button
  onClick={() => setShowMaterialCard(!showMaterialCard)}
  className="absolute bottom-4 right-4 bg-gray-700 hover:bg-gray-600 p-2 rounded-lg shadow text-white z-10"
  title={showMaterialCard ? 'Ocultar Núcleo' : 'Mostrar Núcleo'}
>
  {showMaterialCard ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
</button>

{/* Tarjeta del núcleo, alineada a la derecha con mismo espaciado */}
{showMaterialCard && (
  <div className="absolute bottom-4 right-6 w-[250px] bg-[#2e2e2e] px-6 py-4 rounded-xl text-center shadow border border-[#444]">
    <p className="text-sm text-gray-400">Material del Núcleo</p>
    <p className="text-xl font-semibold text-white mt-1">
      {targetNucleus === 'Gold' ? 'Oro' : targetNucleus === 'Silver' ? 'Plata' : 'Cobre'}
    </p>
    <p className="text-sm text-white mt-1">Protones: {atomInfo.protons}</p>
    <p className="text-sm text-white">Neutrones: {atomInfo.neutrons}</p>
  </div>
)}

  </div>
</div>
      </section>
    </main>

    <AnimatePresence>
      {showModal && (
        <motion.div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-60 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="bg-[#1e1e1e] rounded-xl p-8 w-[90%] max-w-md shadow-xl border border-gray-600"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            <h2 className="text-2xl font-bold text-center text-white mb-2">Miembros del Proyecto</h2>
            <img src={epico} alt="Miembro del Proyecto" className="mx-auto w-40 h-40 object-cover rounded-full border-4 border-sky-600 shadow mb-4" />

            <div className="text-center text-gray-300 space-y-2 mt-4">
              <p>Kevin David Sánchez Rodríguez</p>
              <p>Juan David Triana Polo</p>
            </div>
            <div className="mt-6 bg-[#2a2a2a] rounded-lg p-4 text-center text-gray-300">
              <p className="text-sm">Tecnólogo en Gestión Informática</p>
              <p className="text-sm">Física Moderna</p>
              <p className="text-sm">7°A</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow">
                Cerrar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
  );
}
