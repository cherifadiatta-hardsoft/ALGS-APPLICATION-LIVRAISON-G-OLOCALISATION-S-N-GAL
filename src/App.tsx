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
      <div className="min-h-screen w-screen bg-slate-950 overflow-hidden font-sans relative flex items-center justify-center p-0 select-none">
        
        {/* Master layout panel */}
        {/* On Mobile: Styled like a single-screen responsive mobile web app */}
        {/* On Desktop/Tablet (md and above): Styled like a fully fluid widescreen web application dashboard layout (Sidebar + Map side-by-side) */}
        <div className="w-full h-[100dvh] md:h-screen flex-shrink-0 z-10 relative flex flex-col md:flex-row bg-slate-900">
          
          {/* Main Sidebar control desk */}
          <div className="w-full md:w-[420px] h-full flex-shrink-0 z-20 relative shadow-2xl">
            <GameSidebar />
          </div>

          {/* Interactive Wide-screen Map Surface (hidden on mobile device, shown on standard web version) */}
          <div className="hidden md:flex flex-1 h-full relative p-4 bg-slate-950 border-l border-slate-900 flex-col">
            <GameMap />
          </div>

        </div>

      </div>
    </DeliveryProvider>
  );
}
