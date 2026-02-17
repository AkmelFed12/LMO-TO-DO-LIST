
import React, { useState, useEffect } from 'react';
import { Question, User } from '../types';
import { saveResult, createDailyQuizIfNeeded, getQuestionsByIds, deactivateExpiredDailyQuiz } from '../services/storageService';
import { CheckCircle, XCircle, Loader2, ArrowRight, Timer, Mail } from 'lucide-react';

interface QuizProps {
  user: User;
  onComplete: () => void;
}

export const Quiz: React.FC<QuizProps> = ({ user, onComplete }) => {
  // States
  const [phase, setPhase] = useState<'SETUP' | 'LOADING' | 'PLAYING' | 'FINISHED'>('SETUP');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25); // Slightly more time for harder Qs
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');

  // --- 1. SETUP PHASE ---
  const handleStartQuiz = async () => {
    setPhase('LOADING');
    setError('');

    try {
      const nowUtc = new Date();
      await deactivateExpiredDailyQuiz(nowUtc);
      const dailyQuiz = await createDailyQuizIfNeeded(nowUtc, 10);
      if (!dailyQuiz || !dailyQuiz.isActive) {
        setError("Le quiz du jour n'est pas disponible. Revenez demain insha'Allah.");
        setPhase('SETUP');
        return;
      }

      const data = await getQuestionsByIds(dailyQuiz.questionIds);
      if (data.length === 0) {
        setError("Aucune question disponible pour aujourd'hui.");
        setPhase('SETUP');
        return;
      }

      setQuestions(data);
      setPhase('PLAYING');
    } catch (e) {
      console.error(e);
      setError("Erreur lors du chargement du quiz.");
      setPhase('SETUP');
    }
  };

  // --- 2. TIMER EFFECT ---
  useEffect(() => {
    if (phase !== 'PLAYING' || isAnswered || isSaving) return;

    if (timeLeft === 0) {
      setIsAnswered(true);
      setSelectedOption(null);
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, phase, isAnswered, isSaving]);

  // --- 3. HANDLERS ---
  const handleOptionClick = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    if (index === questions[currentIndex].correctAnswerIndex) {
      setScore(s => s + 5);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeLeft(25); 
    } else {
      finishQuiz();
    }
  };

  const sendScoreByEmail = () => {
      const subject = `Score Quiz ASAA - ${user.username}`;
      const body = `
As-salamu alaykum,

Voici le résultat du quiz pour le participant : ${user.username}

SCORE : ${score} / ${questions.length * 5}
Niveau : Quiz du jour (Difficile)
Questions posées : ${questions.length}
Date : ${new Date().toLocaleString('fr-FR')}

Association des Serviteurs d'Allah Azawajal (ASAA).
      `;
      
      window.location.href = `mailto:ouattaral2@student.iugb.edu.ci?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const finishQuiz = async () => {
    setIsSaving(true);
    try {
      await saveResult({
        username: user.username,
        score: score,
        totalQuestions: questions.length,
        date: new Date().toISOString(),
        difficultyLevel: 'DAILY'
      });
    } catch (error) {
      console.error("Failed to save results", error);
    } finally {
      setIsSaving(false);
      setPhase('FINISHED');
      
      // AUTOMATIC EMAIL TRIGGER
      // Small delay to ensure the UI transition happens first
      setTimeout(() => {
        sendScoreByEmail();
      }, 500);
    }
  };

  // --- RENDERERS ---

  if (phase === 'SETUP') {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <h2 className="text-3xl display-font font-bold text-gray-800">Quiz du jour</h2>
          <p className="text-gray-500 mt-2">10 questions difficiles, renouvelées chaque jour.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-100 rounded-lg p-3 text-sm text-center">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          <button onClick={handleStartQuiz} className="bg-gradient-to-r from-emerald-700 to-emerald-900 text-white p-5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition flex items-center gap-4 text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 bg-white/5 rounded-full -mr-10 -mt-10"></div>
            <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
              <Timer size={28} className="text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-amber-200">Démarrer le quiz</h3>
              <p className="text-xs text-emerald-100">Disponible chaque jour de 20h30 à 23h50 (GMT).</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'LOADING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-16 h-16 text-emerald-600 animate-spin mb-6" />
        <h3 className="text-xl font-bold text-gray-700 mb-2">L'IA prépare votre quiz...</h3>
        <p className="text-sm text-gray-500">Quiz du jour en cours de chargement</p>
        <div className="flex gap-2 mt-4">
           <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-75"></span>
           <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-150"></span>
           <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-300"></span>
        </div>
      </div>
    );
  }

  if (phase === 'FINISHED') {
    const maxScore = questions.length * 5;
    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">{score >= maxScore / 2 ? '🏆' : '📚'}</span>
        </div>
        <h2 className="text-2xl display-font font-bold text-gray-800 mb-2">Quiz Terminé !</h2>
        
        <div className="text-5xl font-bold text-emerald-600 mb-2">{score}/{maxScore}</div>
        <p className="text-sm text-gray-500 mb-8">Votre score final (Quiz du jour)</p>

        <div className="space-y-3">
            <button 
                onClick={sendScoreByEmail}
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 px-6 rounded-lg transition transform hover:scale-105 flex items-center justify-center gap-2 border border-blue-200"
            >
                <Mail size={18} />
                Renvoyer mon score
            </button>

            <button 
            onClick={onComplete}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition transform hover:scale-105"
            >
            Voir le classement
            </button>
        </div>
        
        <p className="text-xs text-gray-400 mt-4">
            Une copie du score est générée automatiquement vers ouattaral2@student.iugb.edu.ci
        </p>
      </div>
    );
  }

  // --- PLAYING PHASE ---
  const currentQuestion = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col flex-1 mr-4">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Question {currentIndex + 1}/{questions.length}</span>
                <span className="font-semibold text-emerald-700">Score: {score}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                ></div>
              </div>
          </div>
          
          <div className={`flex items-center gap-1 font-bold rounded-lg px-3 py-1.5 shadow-sm border ${timeLeft <= 5 && !isAnswered ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white text-gray-700 border-gray-200'}`}>
              <Timer size={18} />
              <span>{timeLeft}s</span>
          </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative">
        {/* Difficulty Badge */}
        <div className="absolute top-4 right-4">
             <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide
                ${currentQuestion.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                  currentQuestion.difficulty === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                  currentQuestion.difficulty === 'HARD' ? 'bg-orange-100 text-orange-700' :
                  currentQuestion.difficulty === 'EXPERT' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                 {currentQuestion.difficulty || 'Normal'}
             </span>
        </div>

        <div className="p-6 md:p-8">
          <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-800 mb-6 leading-relaxed pr-8">
            {currentQuestion.questionText}
          </h2>

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              let optionClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ";
              
              if (!isAnswered) {
                optionClass += "border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer";
              } else {
                 if (idx === currentQuestion.correctAnswerIndex) {
                    optionClass += "border-emerald-500 bg-emerald-50 text-emerald-900";
                 } else if (idx === selectedOption) {
                    optionClass += "border-red-500 bg-red-50 text-red-900";
                 } else {
                    optionClass += "border-gray-100 text-gray-400 opacity-60";
                 }
              }

              return (
                <button 
                  key={idx}
                  onClick={() => handleOptionClick(idx)}
                  disabled={isAnswered}
                  className={optionClass}
                >
                  <span className="font-medium">{option}</span>
                  {isAnswered && idx === currentQuestion.correctAnswerIndex && <CheckCircle className="text-emerald-500" size={20} />}
                  {isAnswered && idx === selectedOption && idx !== currentQuestion.correctAnswerIndex && <XCircle className="text-red-500" size={20} />}
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <div className="mt-6 pt-6 border-t border-gray-100 animate-in slide-in-from-bottom-2 fade-in">
              {selectedOption === null && (
                  <div className="bg-red-50 text-red-700 px-4 py-2 rounded-md mb-4 text-sm font-bold border border-red-100 text-center">
                      Temps écoulé !
                  </div>
              )}
              
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-md">
                <p className="font-bold text-amber-800 text-sm mb-1">Explication :</p>
                <p className="text-amber-900 text-sm">{currentQuestion.explanation || "Réponse correcte."}</p>
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={handleNext}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition shadow-lg hover:shadow-xl"
                >
                  {currentIndex < questions.length - 1 ? 'Question Suivante' : 'Terminer le Quiz'}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
