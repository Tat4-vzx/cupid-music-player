import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart,
  Music,
  Image as ImageIcon,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Shuffle,
  Calendar,
  Sparkles
} from 'lucide-react';
import './App.css';
import useAudioPlayer from './useAudioPlayer';
import { getPhotos, addPhoto, deletePhoto } from './photoDb';

// Componente para Rolagem de Texto (Marquee)
function MarqueeText({ className, text }) {
  const outerRef = useRef(null);
  const textRef = useRef(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const outer = outerRef.current;
    const textEl = textRef.current;
    if (!outer || !textEl) return;
    setShouldScroll(textEl.offsetWidth > outer.clientWidth);
  }, [text]);

  return (
    <div className={`${className} overflow-hidden whitespace-nowrap relative w-full`} ref={outerRef}>
      <span ref={textRef} className="inline-block invisible absolute">{text}</span>
      <div className={`inline-block ${shouldScroll ? 'animate-marquee' : ''}`}>
        <span className="pr-4">{text}</span>
        {shouldScroll && <span className="pr-4">{text}</span>}
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('musica'); // 'musica' | 'fotos'
  const [tracks, setTracks] = useState([]);
  const [defaultPhotos, setDefaultPhotos] = useState([]);
  const [dbPhotos, setDbPhotos] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  // Estados do Player
  const [playMode, setPlayMode] = useState('normal'); // 'normal' | 'shuffle' | 'repeat'
  
  // Modal de Fotos
  const [activePhotoIndex, setActivePhotoIndex] = useState(null);

  // Gestos de toque (Swipe) para o modal de fotos
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Carrega fotos locais do IndexedDB
  const loadDbPhotos = useCallback(async () => {
    try {
      const savedPhotos = await getPhotos();
      setDbPhotos(savedPhotos);
    } catch (err) {
      console.error('Erro ao carregar fotos do IndexedDB:', err);
    }
  }, []);

  // Busca dados iniciais (músicas, fotos padrão e IndexedDB)
  useEffect(() => {
    // Carregar playlist local
    fetch('./music/playlist.json')
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar playlist.json');
        return res.json();
      })
      .then((data) => {
        setTracks(data);
        setLoadingTracks(false);
      })
      .catch((err) => {
        console.error('Erro ao carregar playlist.json:', err);
        setLoadingTracks(false);
      });

    // Carregar fotos padrão
    fetch('./photos/photos.json')
      .then((res) => {
        if (!res.ok) throw new Error('Falha ao carregar photos.json');
        return res.json();
      })
      .then((data) => {
        // Mapear fotos padrão com um ID identificável
        const mapped = data.map((item, idx) => ({
          ...item,
          id: `default-${idx}`,
          isDefault: true
        }));
        setDefaultPhotos(mapped);
        setLoadingPhotos(false);
      })
      .catch((err) => {
        console.error('Erro ao carregar photos.json:', err);
        setLoadingPhotos(false);
      });

    loadDbPhotos();
  }, [loadDbPhotos]);

  // Hook do Player de Música
  const {
    track,
    trackIndex,
    setTrackIndex,
    isPlaying,
    progress,
    duration,
    currentTime,
    togglePlay,
    next,
    prev,
    seek,
    volume,
    setVolume,
    muted,
    toggleMute,
  } = useAudioPlayer(tracks, playMode);

  // Configuração da API Media Session
  useEffect(() => {
    if (!track || track.title === 'No track') return;

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || 'Presente da Lívia 🌸',
        artwork: [
          {
            src: track.art || 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=300',
            sizes: '96x96',
            type: 'image/jpeg'
          },
          {
            src: track.art || 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=512',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      });

      navigator.mediaSession.setActionHandler('play', togglePlay);
      navigator.mediaSession.setActionHandler('pause', togglePlay);
      navigator.mediaSession.setActionHandler('previoustrack', prev);
      navigator.mediaSession.setActionHandler('nexttrack', next);
    }
  }, [track, togglePlay, prev, next]);

  // Sincronizar estado de reprodução na Media Session
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // Alterna o modo de reprodução (normal, shuffle, repeat)
  const cyclePlayMode = () => {
    setPlayMode((prevMode) => {
      if (prevMode === 'normal') return 'shuffle';
      if (prevMode === 'shuffle') return 'repeat';
      return 'normal';
    });
  };

  // Junta as fotos do banco local com as padrão
  const allPhotos = [...dbPhotos, ...defaultPhotos];

  // Upload de Foto
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Verificar se é imagem
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64Url = event.target.result;
        const newPhoto = {
          id: `db-${Date.now()}`,
          url: base64Url,
          caption: 'Foto adicionada via upload! 💖',
          date: Date.now(),
          isDefault: false
        };
        await addPhoto(newPhoto);
        await loadDbPhotos();
      } catch (err) {
        console.error('Erro ao salvar foto:', err);
        alert('Não foi possível salvar a foto localmente.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Excluir foto adicionada pelo usuário
  const handleDeletePhoto = async (photoId, e) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir esta foto de suas memórias?')) {
      try {
        await deletePhoto(photoId);
        await loadDbPhotos();
        if (activePhotoIndex !== null) {
          setActivePhotoIndex(null);
        }
      } catch (err) {
        console.error('Erro ao excluir foto:', err);
      }
    }
  };

  // Navegação no Modal de Fotos
  const handlePrevPhoto = () => {
    if (allPhotos.length === 0) return;
    setActivePhotoIndex((prevIdx) => (prevIdx - 1 + allPhotos.length) % allPhotos.length);
  };

  const handleNextPhoto = () => {
    if (allPhotos.length === 0) return;
    setActivePhotoIndex((prevIdx) => (prevIdx + 1) % allPhotos.length);
  };

  // Handlers para gestos de toque no iPhone (Swipe)
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 60; // Deslizar para a esquerda -> Próxima
    const isRightSwipe = distance < -60; // Deslizar para a direita -> Anterior

    if (isLeftSwipe) {
      handleNextPhoto();
    } else if (isRightSwipe) {
      handlePrevPhoto();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Formatar tempo (segundos em mm:ss)
  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[#FFF5F7] via-[#FFF0F3] to-[#FFE4E8]">
      
      {/* Cabeçalho Festivo do Presente */}
      <header className="pt-8 pb-4 text-center px-4 relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-pink-200/30 rounded-full blur-2xl"></div>
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-rose-200/30 rounded-full blur-2xl"></div>
        
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-100 text-pink-600 rounded-full text-xs font-semibold tracking-wider uppercase mb-2 animate-bounce">
          <Sparkles className="w-3.5 h-3.5" />
          Para a minha irmã Lívia 🌸
        </div>
        
        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-rose-500 font-['Fredoka'] drop-shadow-sm">
          Lívia's Cozy Space
        </h1>
        <p className="text-pink-500/80 text-xs md:text-sm mt-1 max-w-sm mx-auto font-medium">
          Músicas preferidas e memórias lindas guardadas com amor. 🎂💖
        </p>
      </header>

      {/* Conteúdo Principal com Layout Responsivo */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 pb-28">
        
        {/* Aba do Player de Música */}
        {activeTab === 'musica' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start mt-2">
            
            {/* Lado Esquerdo: Player de Música */}
            <div className="md:col-span-6 bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-md border border-pink-100/50 flex flex-col items-center">
              
              {/* Vinil Giratório Decorativo */}
              <div className="relative my-4 flex items-center justify-center">
                
                {/* Agulha do toca-discos */}
                <div 
                  className={`absolute top-0 right-10 w-16 h-24 origin-top-right z-10 transition-transform duration-500 pointer-events-none`}
                  style={{
                    transform: isPlaying ? 'rotate(15deg)' : 'rotate(-15deg)',
                    transformOrigin: '90% 10%'
                  }}
                >
                  <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-md">
                    <path d="M90 10 L60 20 L40 100 L35 150" fill="none" stroke="#D1D5DB" strokeWidth="6" strokeLinecap="round" />
                    <circle cx="90" cy="10" r="10" fill="#9CA3AF" />
                    <rect x="25" y="145" width="20" height="25" rx="3" fill="#F472B6" />
                  </svg>
                </div>

                {/* Corpo do Disco (Vinyl) */}
                <div 
                  className={`relative w-56 h-56 md:w-64 md:h-64 rounded-full bg-neutral-900 border-8 border-pink-100 flex items-center justify-center shadow-lg transition-transform`}
                  style={{ 
                    animation: isPlaying ? 'spin 12s linear infinite' : 'none'
                  }}
                >
                  {/* Sulcos do disco */}
                  <div className="absolute inset-4 rounded-full border border-neutral-800 border-dashed opacity-40"></div>
                  <div className="absolute inset-8 rounded-full border border-neutral-800 border-dashed opacity-40"></div>
                  <div className="absolute inset-12 rounded-full border border-neutral-800 border-dashed opacity-40"></div>
                  <div className="absolute inset-16 rounded-full border border-neutral-800 border-dashed opacity-40"></div>
                  
                  {/* Foto de Capa no Centro */}
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-pink-50 overflow-hidden border-4 border-neutral-900 flex items-center justify-center">
                    <img 
                      src={track.art || 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=150'} 
                      alt="Capa do Álbum" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=150';
                      }}
                    />
                  </div>
                  {/* Furo central do vinil */}
                  <div className="absolute w-3.5 h-3.5 rounded-full bg-[#FFF5F7] border border-neutral-900"></div>
                </div>

                {/* Sombra decorativa pulsante */}
                <div className={`absolute inset-0 rounded-full bg-pink-300/20 -z-10 transition-transform duration-1000 ${isPlaying ? 'scale-105 blur-md animate-pulse' : 'scale-100'}`}></div>
              </div>

              {/* Informações da Música Ativa */}
              <div className="text-center w-full mt-4 px-2">
                <MarqueeText 
                  className="text-lg md:text-xl font-bold text-gray-800 font-['Fredoka']" 
                  text={track.title || 'Selecione uma música'} 
                />
                <p className="text-pink-500 text-sm font-semibold mt-0.5">
                  {track.artist || 'Nenhuma faixa selecionada'}
                </p>
                {track.album && (
                  <p className="text-gray-400 text-xs mt-0.5 italic">
                    Álbum: {track.album}
                  </p>
                )}
              </div>

              {/* Controle do Progresso */}
              <div className="w-full mt-6">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration - currentTime)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.001"
                  value={progress || 0}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-pink-100 rounded-lg appearance-none cursor-pointer accent-pink-500 focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #F472B6 0%, #F472B6 ${progress * 100}%, #FEE2E2 ${progress * 100}%, #FEE2E2 100%)`
                  }}
                />
              </div>

              {/* Botões de Controle Clássicos */}
              <div className="flex items-center gap-6 mt-6">
                <button
                  onClick={cyclePlayMode}
                  title={`Modo de Reprodução: ${playMode}`}
                  className={`p-2 rounded-full transition-colors ${
                    playMode !== 'normal' ? 'text-pink-500 bg-pink-50' : 'text-gray-400 hover:text-pink-400'
                  }`}
                >
                  {playMode === 'repeat' ? (
                    <Repeat className="w-5 h-5" />
                  ) : playMode === 'shuffle' ? (
                    <Shuffle className="w-5 h-5" />
                  ) : (
                    <Repeat className="w-5 h-5 opacity-40" />
                  )}
                </button>

                <button
                  onClick={prev}
                  disabled={tracks.length === 0}
                  className="p-2.5 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  <SkipBack className="w-5 h-5 fill-current" />
                </button>

                <button
                  onClick={togglePlay}
                  disabled={tracks.length === 0}
                  className="p-4 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-md shadow-pink-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={next}
                  disabled={tracks.length === 0}
                  className="p-2.5 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>

                <button
                  onClick={toggleMute}
                  className="p-2 rounded-full text-gray-400 hover:text-pink-400 hover:bg-pink-50 transition-colors"
                >
                  {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              {/* Slider de Volume */}
              <div className="w-3/4 flex items-center gap-3 mt-4">
                <VolumeX className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-pink-100 rounded-lg appearance-none cursor-pointer accent-pink-400 focus:outline-none"
                  style={{
                    background: `linear-gradient(to right, #F472B6 0%, #F472B6 ${(muted ? 0 : volume) * 100}%, #FEE2E2 ${(muted ? 0 : volume) * 100}%, #FEE2E2 100%)`
                  }}
                />
                <Volume2 className="w-4 h-4 text-gray-400" />
              </div>

            </div>

            {/* Lado Direito: Playlist de Músicas */}
            <div className="md:col-span-6 bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-md border border-pink-100/50 flex flex-col h-[480px]">
              <h2 className="text-lg font-bold text-gray-800 font-['Fredoka'] mb-4 flex items-center gap-2">
                <Music className="w-5 h-5 text-pink-500" />
                Sua Playlist 💖
              </h2>

              {loadingTracks ? (
                <div className="flex-1 flex items-center justify-center text-pink-400 text-sm">
                  Carregando músicas fofas...
                </div>
              ) : tracks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                  <p>Nenhuma música encontrada.</p>
                  <p className="text-xs text-pink-400">Adicione arquivos MP3 na pasta public/music/</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {tracks.map((t, idx) => {
                    const isCurrent = idx === trackIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (isCurrent) {
                            togglePlay();
                          } else {
                            seek(0);
                            setTrackIndex(idx);
                          }
                        }}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all ${
                          isCurrent 
                            ? 'bg-pink-100/70 border border-pink-200/50 shadow-sm shadow-pink-100' 
                            : 'hover:bg-pink-50/50 border border-transparent'
                        }`}
                      >
                        <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-pink-100 flex-shrink-0">
                          <img 
                            src={t.art || 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=100'} 
                            alt={t.title} 
                            className="w-full h-full object-cover" 
                          />
                          {isCurrent && isPlaying && (
                            <div className="absolute inset-0 bg-pink-500/30 flex items-center justify-center">
                              <span className="flex gap-0.5 items-end h-3">
                                <span className="w-0.75 bg-white rounded-full animate-music-bar-1"></span>
                                <span className="w-0.75 bg-white rounded-full animate-music-bar-2"></span>
                                <span className="w-0.75 bg-white rounded-full animate-music-bar-3"></span>
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold text-xs md:text-sm truncate ${isCurrent ? 'text-pink-700' : 'text-gray-800'}`}>
                            {t.title}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">{t.artist}</p>
                        </div>
                        <Heart className={`w-4 h-4 flex-shrink-0 ${isCurrent ? 'text-pink-500 fill-pink-500' : 'text-gray-300'}`} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Aba do Álbum de Fotos */}
        {activeTab === 'fotos' && (
          <div className="mt-2 flex flex-col">
            
            {/* Cabeçalho da Galeria */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800 font-['Fredoka'] flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-pink-500" />
                Álbum da Lívia 🌸
              </h2>
              
              <div className="text-xs text-pink-500/80 bg-pink-100/50 px-3 py-1 rounded-full font-medium">
                {allPhotos.length} fotos salvas
              </div>
            </div>

            {loadingPhotos ? (
              <div className="text-center py-20 text-pink-400">
                Carregando fotos com carinho...
              </div>
            ) : allPhotos.length === 0 ? (
              <div className="text-center py-20 bg-white/50 rounded-3xl border border-pink-100 flex flex-col items-center justify-center p-6 gap-2">
                <ImageIcon className="w-12 h-12 text-pink-300" />
                <p className="text-gray-500 font-semibold">Seu álbum está vazio!</p>
                <p className="text-xs text-gray-400">Use o botão flutuante abaixo para adicionar novas fotos.</p>
              </div>
            ) : (
              /* Grid Estilo Pinterest/Instagram */
              <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
                {allPhotos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    onClick={() => setActivePhotoIndex(idx)}
                    className="break-inside-avoid relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.02] border border-pink-100/50 transition-all cursor-pointer group"
                  >
                    <img 
                      src={photo.url} 
                      alt={photo.caption} 
                      className="w-full h-auto object-cover max-h-72" 
                      loading="lazy"
                    />
                    
                    {/* Overlay com botão excluir (se for do usuário) e caption */}
                    <div className="absolute inset-0 bg-gradient-to-t from-pink-900/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                      <div className="flex justify-end">
                        {!photo.isDefault && (
                          <button
                            onClick={(e) => handleDeletePhoto(photo.id, e)}
                            className="p-1.5 rounded-full bg-white/95 text-red-500 shadow hover:bg-red-50 active:scale-95 transition-all"
                            title="Excluir Foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-white text-xs font-medium truncate drop-shadow">
                        {photo.caption || 'Foto linda ✨'}
                      </p>
                    </div>

                    {/* Legenda básica sempre visível */}
                    <div className="p-3 bg-white">
                      <p className="text-gray-700 text-xs font-semibold line-clamp-2">
                        {photo.caption}
                      </p>
                      {photo.date && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3 text-pink-300" />
                          {new Date(photo.date).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Input de Arquivo Escondido */}
            <input
              type="file"
              id="photo-upload-input"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />

            {/* Botão Flutuante (FAB) para Adicionar Foto */}
            <label
              htmlFor="photo-upload-input"
              className="fixed bottom-24 right-6 z-40 p-4 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-lg shadow-pink-300/40 hover:scale-105 active:scale-95 cursor-pointer transition-all flex items-center justify-center"
              title="Adicionar Nova Foto"
            >
              <Plus className="w-6 h-6" />
            </label>

          </div>
        )}

      </main>

      {/* Mini Player Flutuante (aparece na aba de Fotos) */}
      {activeTab === 'fotos' && track && track.title !== 'No track' && (
        <div 
          onClick={() => setActiveTab('musica')}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 bg-white/90 backdrop-blur-md rounded-2xl p-3 border border-pink-100/80 shadow-lg shadow-pink-200/20 flex items-center justify-between cursor-pointer hover:bg-pink-50/50 transition-all z-30"
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={track.art || 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=80'}
              alt={track.title}
              className={`w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-pink-100 ${isPlaying ? 'animate-spin-slow' : ''}`}
            />
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-gray-800 truncate font-['Fredoka']">{track.title}</h4>
              <p className="text-[10px] text-pink-500 font-semibold truncate">{track.artist}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={togglePlay}
              className="p-2 rounded-full bg-pink-100 text-pink-600 hover:bg-pink-200 transition-colors"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>
            <button
              onClick={next}
              className="p-2 rounded-full text-gray-400 hover:text-pink-500 transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>

          {/* Mini Barra de Progresso no Topo */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-pink-100 rounded-t-2xl overflow-hidden">
            <div className="h-full bg-pink-400" style={{ width: `${progress * 100}%` }}></div>
          </div>
        </div>
      )}

      {/* Barra de Navegação Inferior Fixa (iOS Style) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-pink-100/60 flex justify-around py-3 px-6 z-40 pb-safe shadow-inner">
        <button
          onClick={() => setActiveTab('musica')}
          className={`flex flex-col items-center gap-0.5 font-medium transition-all ${
            activeTab === 'musica' ? 'text-pink-500 scale-105' : 'text-gray-400 hover:text-pink-400'
          }`}
        >
          <Music className="w-6 h-6" />
          <span className="text-[10px]">Músicas</span>
        </button>

        <button
          onClick={() => setActiveTab('fotos')}
          className={`flex flex-col items-center gap-0.5 font-medium transition-all ${
            activeTab === 'fotos' ? 'text-pink-500 scale-105' : 'text-gray-400 hover:text-pink-400'
          }`}
        >
          <ImageIcon className="w-6 h-6" />
          <span className="text-[10px]">Álbum</span>
        </button>
      </nav>

      {/* Modal Expandido do Visualizador de Fotos (Slideshow com Gestos) */}
      {activePhotoIndex !== null && allPhotos[activePhotoIndex] && (
        <div 
          className="fixed inset-0 bg-neutral-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 select-none touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Botão Fechar */}
          <button
            onClick={() => setActivePhotoIndex(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white/80 hover:bg-white/20 active:scale-90 transition-all z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Botão Excluir (no modal) se for do usuário */}
          {!allPhotos[activePhotoIndex].isDefault && (
            <button
              onClick={(e) => handleDeletePhoto(allPhotos[activePhotoIndex].id, e)}
              className="absolute top-4 left-4 p-2 rounded-full bg-white/10 text-red-400 hover:bg-white/20 hover:text-red-500 active:scale-90 transition-all z-10"
              title="Excluir Foto"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}

          {/* Área Central da Imagem */}
          <div className="relative w-full max-w-2xl flex-1 flex items-center justify-center py-8">
            
            {/* Seta Esquerda */}
            <button
              onClick={handlePrevPhoto}
              className="absolute left-2 p-3 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:scale-105 active:scale-95 transition-all hidden md:flex"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Imagem Exibida */}
            <div className="relative max-h-full max-w-full flex flex-col justify-center items-center">
              <img
                src={allPhotos[activePhotoIndex].url}
                alt={allPhotos[activePhotoIndex].caption}
                className="max-h-[70vh] md:max-h-[75vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl border border-white/10 select-none pointer-events-none"
              />
              
              {/* Legenda */}
              {allPhotos[activePhotoIndex].caption && (
                <div className="mt-4 px-4 py-2 bg-white/10 backdrop-blur-md text-white text-xs md:text-sm font-semibold rounded-2xl text-center max-w-lg border border-white/5">
                  {allPhotos[activePhotoIndex].caption}
                </div>
              )}
            </div>

            {/* Seta Direita */}
            <button
              onClick={handleNextPhoto}
              className="absolute right-2 p-3 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:scale-105 active:scale-95 transition-all hidden md:flex"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Dica de Uso para Mobile */}
          <div className="text-[10px] text-gray-500 mb-2 md:hidden">
            Deslize para o lado para navegar ⚡
          </div>
        </div>
      )}

    </div>
  );
}
