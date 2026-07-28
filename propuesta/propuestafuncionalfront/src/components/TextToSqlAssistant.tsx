import React, { useState } from 'react';
import { TextToSQLResponse } from '../types';
import { MessageSquare, Sparkles, Send, Table, HelpCircle, Bot, Loader2, RefreshCw } from 'lucide-react';

interface TextToSqlAssistantProps {
  onSendQuery: (pregunta: string) => Promise<TextToSQLResponse | null>;
  isLoading: boolean;
}

export const TextToSqlAssistant: React.FC<TextToSqlAssistantProps> = ({ onSendQuery, isLoading }) => {
  const [inputQuery, setInputQuery] = useState<string>('');
  const [history, setHistory] = useState<TextToSQLResponse[]>([]);
  const [activeQueryText, setActiveQueryText] = useState<string>('');
  const [isQueryLoading, setIsQueryLoading] = useState<boolean>(false);

  const isProcessing = isLoading || isQueryLoading;

  const sampleQuestions = [
    "¿Cuál fue la tasa de cumplimiento de SLA en tickets medios durante las horas de almuerzo?",
    "¿Cuántos tickets fueron escalados de N1 a N2 y cuál fue su lead time promedio?",
    "¿Muestra los analistas y perfiles con mayor tiempo de espera en colas?",
    "¿Cuál es el cuello de botella principal de la jornada y qué nivel tiene mayor utilización?"
  ];

  const handleSend = async (queryText?: string) => {
    const queryToUse = queryText || inputQuery;
    if (!queryToUse.trim() || isProcessing) return;

    setActiveQueryText(queryToUse);
    setIsQueryLoading(true);

    try {
      const response = await onSendQuery(queryToUse);
      if (response) {
        setHistory([response, ...history]);
        setInputQuery('');
      }
    } finally {
      setIsQueryLoading(false);
      setActiveQueryText('');
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Assistant Banner */}
      <div className="bg-[#141416] p-6 rounded-2xl border border-white/5 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2.5">
              <span>Agente Text-to-SQL (Ollama LLM en Docker)</span>
              <span className="bg-purple-500/10 text-purple-300 text-[10px] px-2.5 py-0.5 rounded-full border border-purple-500/20 font-mono tracking-wider">
                LLAMA3 / MISTRAL
              </span>
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Realiza preguntas en lenguaje natural sobre las métricas operacionales de la mesa de ayuda. El agente construirá la consulta PostgreSQL basada en el esquema DDL y ejecutará la respuesta.
            </p>
          </div>
        </div>

        {/* Preset Prompt Chips */}
        <div className="mt-5 pt-4 border-t border-white/5">
          <span className="text-xs text-gray-400 font-mono font-medium block mb-2">Consultas Sugeridas:</span>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={isProcessing}
                className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 hover:border-purple-500/30 px-3 py-1.5 rounded-xl text-left transition-all disabled:opacity-50 flex items-center space-x-1.5"
              >
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Box */}
      <div className="bg-[#141416] p-4 rounded-2xl border border-white/5 shadow-xl">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              disabled={isProcessing}
              placeholder="Ej: ¿Cuál fue la tasa de cumplimiento de SLA en tickets medios durante el almuerzo?"
              className="w-full bg-[#1a1a1e] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
            />
            {isProcessing && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1.5 bg-purple-500/10 text-purple-400 text-[10px] font-mono px-2 py-1 rounded-lg border border-purple-500/20">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generando SQL...</span>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isProcessing || !inputQuery.trim()}
            className="bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center space-x-2 disabled:opacity-50 border border-purple-400/30"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{isProcessing ? 'PROCESANDO...' : 'CONSULTAR'}</span>
          </button>
        </form>
      </div>

      {/* Query History Responses & Loading Indicator */}
      <div className="space-y-6">
        {/* Loading Indicator Wheel / Card */}
        {isProcessing && (
          <div className="bg-gradient-to-r from-purple-950/40 via-[#16161b] to-indigo-950/40 p-6 rounded-2xl border border-purple-500/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-4">
              <div className="flex items-center space-x-3.5">
                <div className="relative flex items-center justify-center p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-400 rounded-full animate-ping" />
                </div>
                <div>
                  <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <span>Generando Respuesta Text-to-SQL</span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full font-mono border border-purple-500/30">
                      Ollama / Gemini LLM
                    </span>
                  </h3>
                  <p className="text-xs text-purple-300/80 font-mono mt-0.5">
                    Sintetizando consulta PostgreSQL basada en el esquema DDL y ejecutando sobre la base de datos...
                  </p>
                </div>
              </div>
              <span className="hidden sm:flex items-center space-x-1.5 text-xs font-mono text-purple-300 font-bold bg-purple-500/10 px-3 py-1.5 rounded-xl border border-purple-500/20">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                <span>Procesando...</span>
              </span>
            </div>

            {activeQueryText && (
              <div className="bg-[#0f0f13] p-3.5 rounded-xl border border-purple-500/20 font-mono text-xs text-gray-300 flex items-start space-x-2.5">
                <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <span className="text-purple-400 font-bold block mb-0.5">Consulta realizada:</span>
                  <span className="italic text-white">"{activeQueryText}"</span>
                </div>
              </div>
            )}

            {/* Skeleton Loading Progress */}
            <div className="space-y-2.5 pt-1 font-mono text-xs">
              <div className="flex justify-between text-[11px] text-gray-400">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                  <span>Construyendo sintaxis SQL y consultando modelo...</span>
                </span>
                <span className="text-purple-400 font-bold">En curso</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 h-full w-3/4 animate-pulse rounded-full" />
              </div>
            </div>
          </div>
        )}

        {history.map((item, idx) => (
          <div key={idx} className="bg-[#141416] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            {/* User Question Header */}
            <div className="bg-white/5 px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white font-mono">Pregunta: "{item.pregunta}"</span>
              </div>
              <span className="text-[10px] bg-white/5 text-gray-400 px-2.5 py-0.5 rounded-full border border-white/10 font-mono">
                {item.modelo_utilizado}
              </span>
            </div>

            <div className="p-5 space-y-4 font-mono">
              {/* Natural Language Explanation */}
              <div className="text-xs text-gray-300 leading-relaxed bg-[#1a1a1e] p-4 rounded-xl border border-white/5">
                <span className="font-bold text-purple-300">Explicación LLM: </span>
                {item.explicacion}
              </div>



              {/* Execution Results Table */}
              {item.filas && item.filas.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-300 flex items-center space-x-1.5">
                      <Table className="w-3.5 h-3.5 text-blue-400" />
                      <span>Resultados de la Base de Datos ({item.total_filas} filas)</span>
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-white/5 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-white/5 text-gray-400 font-semibold border-b border-white/5 text-[10px] uppercase tracking-wider">
                          {item.columnas.map((col, cIdx) => (
                            <th key={cIdx} className="py-2.5 px-3">
                              {col.replace(/_/g, ' ')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-gray-200">
                        {item.filas.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-white/5">
                            {item.columnas.map((col, cIdx) => (
                              <td key={cIdx} className="py-2.5 px-3 font-medium">
                                {typeof row[col] === 'boolean'
                                  ? row[col] ? 'TRUE' : 'FALSE'
                                  : row[col] ?? 'N/A'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400 py-3 text-center bg-white/5 rounded-xl">
                  No se encontraron filas que coincidan con el criterio filtrado.
                </div>
              )}
            </div>
          </div>
        ))}

        {history.length === 0 && (
          <div className="text-center py-12 bg-[#141416] rounded-2xl border border-dashed border-white/10">
            <HelpCircle className="w-10 h-10 text-gray-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-300 font-mono">Haz una pregunta operacional en lenguaje natural</p>
            <p className="text-xs text-gray-500 font-mono mt-1 max-w-md mx-auto">
              El motor enviará el contexto DDL de la base de datos PostgreSQL a Ollama para construir la consulta SQL exacta y presentar la respuesta estructurada.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
