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
      <div className="flex flex-col md:flex-row h-screen w-screen bg-slate-950 overflow-hidden font-sans">
        
        {/* Main Sidebar control desk */}
        <div className="w-full md:w-[420px] h-[55%] md:h-full flex-shrink-0 z-20 shadow-2xl relative">
          <GameSidebar />
        </div>

        {/* Interactive Map Surface */}
        <div className="flex-1 h-[45%] md:h-full relative p-2 md:p-4 bg-slate-950">
          <GameMap />
        </div>

      </div>
    </DeliveryProvider>
  );
}
