import React, { Children } from 'react';
import { ArrowUpRight, Users, FileText, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
const links = [
{
  name: 'My Children',
  icon: Users,
  href: '#'
},
{
  name: 'Invoices',
  icon: FileText,
  href: '#'
},
{
  name: 'Messages',
  icon: MessageSquare,
  href: '#'
}];

export function QuickLinks() {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
        Quick Links
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {links.map((link, index) =>
        <motion.a
          key={link.name}
          href={link.href}
          initial={{
            opacity: 0,
            y: 20
          }}
          animate={{
            opacity: 1,
            y: 0
          }}
          transition={{
            duration: 0.4,
            delay: 0.3 + index * 0.1
          }}
          className="group flex items-center justify-between p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-teal-200 transition-all duration-300">

            <div className="flex items-center gap-4">
              <div className="p-2 bg-teal-50 rounded-lg group-hover:bg-teal-100 transition-colors">
                <link.icon className="w-5 h-5 text-teal-500 group-hover:text-teal-700 transition-colors" />
              </div>
              <span className="font-medium text-gray-700 group-hover:text-teal-700 transition-colors">
                {link.name}
              </span>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-teal-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </motion.a>
        )}
      </div>
    </section>);

}