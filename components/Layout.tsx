import React, { useState, useEffect } from 'react';
import { User, AppView } from '../types';
import { LogOut, Award, Settings, Home, MessageCircle, User as UserIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const ClockDisplay = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // GMT Time
    const gmtDate = new Date(time.valueOf() + time.getTimezoneOffset() * 60000);
    
    const frenchDate = new Intl.DateTimeFormat('fr-FR', { 
        weekday: 'long', day: 'numeric', month: 'long', 
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'UTC'
    }).format(gmtDate);

    const arabicDate = new Intl.DateTimeFormat('ar-SA', { 
        weekday: 'long', day: 'numeric', month: 'long', 
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'UTC'
    }).format(gmtDate);

    return (
        <div className="bg-emerald-950/40 rounded-md px-3 py-1 text-[10px] md:text-xs text-emerald-50 flex flex-col md:flex-row md:gap-4 items-center justify-center border border-emerald-700/40">
            <span>GMT: {frenchDate}</span>
            <span className="arabic-font">{arabicDate}</span>
        </div>
    );
};

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentView, onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white shadow-2xl sticky top-0 z-50 border-b border-emerald-800/60">
        <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate(AppView.HOME)}>
                    {/* Logo Section */}
                    <div className="w-12 h-12 bg-white/95 rounded-full flex items-center justify-center border border-amber-300/80 overflow-hidden shrink-0 shadow-md">
                        {/* Ensure you have a logo.png in your public folder or replace src with your image URL */}
                        <img 
                            src="logo.png" 
                            alt="ASAA Logo" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        {/* Fallback if image fails to load */}
                        <span className="text-emerald-700 font-bold text-xs text-center leading-tight hidden">ASAA</span>
                    </div>
                    <div>
                        <h1 className="text-lg md:text-xl font-bold display-font leading-none">Quiz Islamique</h1>
                        <p className="text-[10px] md:text-xs text-emerald-200 font-medium">Association des Serviteurs d'Allah Azawajal</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {user && (
                    <>
                        <nav className="hidden md:flex space-x-2">
                            <button 
                                onClick={() => onNavigate(AppView.HOME)}
                            className={`px-3 py-1 rounded-md text-sm transition ${currentView === AppView.HOME ? 'bg-emerald-800 text-amber-200' : 'hover:bg-emerald-800/70'}`}
                            >
                                Accueil
                            </button>
                            <button 
                                onClick={() => onNavigate(AppView.LEADERBOARD)}
                            className={`px-3 py-1 rounded-md text-sm transition ${currentView === AppView.LEADERBOARD ? 'bg-emerald-800 text-amber-200' : 'hover:bg-emerald-800/70'}`}
                            >
                                Classement
                            </button>
                            <button 
                                onClick={() => onNavigate(AppView.PROFILE)}
                            className={`px-3 py-1 rounded-md text-sm transition ${currentView === AppView.PROFILE ? 'bg-emerald-800 text-amber-200' : 'hover:bg-emerald-800/70'}`}
                            >
                                Profil
                            </button>
                            {user.role === 'ADMIN' && (
                                <button 
                                    onClick={() => onNavigate(AppView.ADMIN)}
                                    className={`px-3 py-1 rounded-md text-sm transition ${currentView === AppView.ADMIN ? 'bg-emerald-800 text-amber-200' : 'hover:bg-emerald-800/70'}`}
                                >
                                    Admin
                                </button>
                            )}
                        </nav>

                        <div className="flex items-center gap-2">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-amber-200">{user.username}</p>
                                <p className="text-xs text-emerald-200 uppercase">{user.role === 'ADMIN' ? 'Administrateur' : 'Membre'}</p>
                            </div>
                            <button 
                                onClick={onLogout}
                                className="p-2 bg-emerald-900 rounded-full hover:bg-emerald-950 transition text-white shadow"
                                title="Se déconnecter"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </>
                    )}
                </div>
            </div>
            
            {/* Clock Bar */}
            <div className="flex justify-center w-full">
               <ClockDisplay />
            </div>
        </div>
      </header>

      {/* Mobile Nav Bar (Bottom) */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 border-t border-gray-200 shadow-lg z-50 flex justify-around p-2 text-emerald-800 backdrop-blur">
             <button onClick={() => onNavigate(AppView.HOME)} className={`flex flex-col items-center p-2 rounded ${currentView === AppView.HOME ? 'text-emerald-600 bg-emerald-50' : ''}`}>
                <Home size={24} />
                <span className="text-xs mt-1">Accueil</span>
             </button>
             <button onClick={() => onNavigate(AppView.LEADERBOARD)} className={`flex flex-col items-center p-2 rounded ${currentView === AppView.LEADERBOARD ? 'text-emerald-600 bg-emerald-50' : ''}`}>
                <Award size={24} />
                <span className="text-xs mt-1">Classement</span>
             </button>
             <button onClick={() => onNavigate(AppView.PROFILE)} className={`flex flex-col items-center p-2 rounded ${currentView === AppView.PROFILE ? 'text-emerald-600 bg-emerald-50' : ''}`}>
                <UserIcon size={24} />
                <span className="text-xs mt-1">Profil</span>
             </button>
             {user.role === 'ADMIN' && (
                 <button onClick={() => onNavigate(AppView.ADMIN)} className={`flex flex-col items-center p-2 rounded ${currentView === AppView.ADMIN ? 'text-emerald-600 bg-emerald-50' : ''}`}>
                    <Settings size={24} />
                    <span className="text-xs mt-1">Admin</span>
                 </button>
             )}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8 mb-16 md:mb-0">
        {children}
      </main>

      <footer className="bg-gray-900 text-gray-400 py-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="text-center md:text-left">
                 <p className="text-sm">© {new Date().getFullYear()} Association des Serviteurs d'Allah Azawajal (ASAA).</p>
                 <p className="text-xs text-gray-500 mt-1">
                    Développé par <span className="text-emerald-500 font-semibold">Ladji Moussa Ouattara</span>, PDG de LMO Dev
                 </p>
             </div>
             
             <a 
                href="https://wa.me/2250574724233" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-bold transition transform hover:scale-105 shadow"
             >
                <MessageCircle size={18} />
                <span>Plus d'infos sur WhatsApp</span>
             </a>
        </div>
      </footer>
    </div>
  );
};
