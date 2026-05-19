/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DeliveryProvider } from './context/DeliveryContext';
import GameMap from './components/GameMap';
import GameSidebar from './components/GameSidebar';
import { APIProvider } from '@vis.gl/react-google-maps';

export default function App() {
  return (
    <DeliveryProvider>
      <div className="min-h-screen w-screen bg-slate-950 overflow-hidden font-sans relative flex items-center justify-center p-0 md:p-6 lg:p-0 select-none">
        
        {/* Fullscreen premium glowing background ambient effects for desktop */}
        <div className="absolute inset-0 z-0 pointer-events-none hidden md:block lg:hidden overflow-hidden">
          <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full filter blur-[120px] animate-pulse" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[500px] h-[500px] bg-yellow-400/5 rounded-full filter blur-[120px] animate-pulse" style={{ animationDelay: '3s' }} />
        </div>

        {/* Master layout panel */}
        {/* On Mobile (smaller than md): Styled exactly like a centralized standalone premium mobile smartphone application container */}
        {/* On Widescreen (lg and above): Styled like a complete widescreen hybrid web application dashboard layout (Sidebar + Map side-by-side) */}
        <div className="w-full h-[100dvh] lg:h-screen lg:max-h-none flex-shrink-0 z-10 lg:shadow-none shadow-3xl relative flex flex-col lg:flex-row bg-slate-900 md:max-w-md lg:max-w-none md:h-[90vh] md:max-h-[850px] md:border md:border-slate-800/80 md:rounded-[32px] lg:border-none lg:rounded-none">
          
          {/* Main Sidebar control desk */}
          <div className="w-full lg:w-[420px] h-full flex-shrink-0 z-20 relative shadow-2xl">
            <GameSidebar />
          </div>

          {/* Interactive Wide-screen Map Surface (hidden on mobile, shown on desktop where it fits perfectly) */}
          <div className="hidden lg:flex flex-1 h-full relative p-4 bg-slate-950 border-l border-slate-900 flex-col">
            <GameMap />
          </div>

        </div>

      </div>
    </DeliveryProvider>
  );
}
