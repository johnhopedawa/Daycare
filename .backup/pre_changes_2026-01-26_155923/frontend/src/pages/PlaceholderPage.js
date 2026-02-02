import React from 'react';
import { Layout } from '../components/Layout';

export function PlaceholderPage({ title, subtitle }) {
  return (
    <Layout title={title} subtitle={subtitle}>
      <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(255,229,217,0.5)] border border-[#FFE5D9]/30 p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-[#FFE5D9] rounded-full flex items-center justify-center">
          <span className="text-4xl">🚧</span>
        </div>
        <h3 className="font-quicksand font-bold text-2xl text-stone-800 mb-2">
          Coming Soon
        </h3>
        <p className="text-stone-500">
          This page is under construction and will be connected to the backend soon.
        </p>
      </div>
    </Layout>
  );
}
