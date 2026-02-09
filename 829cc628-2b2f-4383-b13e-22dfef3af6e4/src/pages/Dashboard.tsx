import React, { Children } from 'react';
import { Users, CreditCard, Banknote, Mail } from 'lucide-react';
import { Header } from '../components/Header';
import { Navigation } from '../components/Navigation';
import { StatCard } from '../components/StatCard';
import { QuickLinks } from '../components/QuickLinks';
import { RecentInvoices } from '../components/RecentInvoices';
import { motion } from 'framer-motion';
export function Dashboard() {
  const stats = [
  {
    label: 'Children Enrolled',
    value: '0',
    icon: Users
  },
  {
    label: 'Outstanding Balance',
    value: '$0.00',
    icon: CreditCard
  },
  {
    label: 'Credit Balance',
    value: '$0.00',
    icon: Banknote
  },
  {
    label: 'Unread Messages',
    value: '0',
    icon: Mail
  }];

  return (
    <div className="min-h-screen bg-brand-50">
      <Header />
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <motion.div
          initial={{
            opacity: 0,
            y: -10
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            duration: 0.5
          }}
          className="mb-10 text-center md:text-left">

          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2 tracking-tight">
            Welcome back, <span className="text-teal-500">Test</span>
          </h1>
          <p className="text-gray-500 text-lg">
            Here is a snapshot of your family account
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) =>
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            delay={0.1 * index} />

          )}
        </div>

        {/* Quick Links Section */}
        <QuickLinks />

        {/* Recent Invoices Section */}
        <RecentInvoices />
      </main>
    </div>);

}