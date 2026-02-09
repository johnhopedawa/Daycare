import React from 'react';
import { motion } from 'framer-motion';
const invoices = [
{
  id: 'INV-202511-001',
  date: '11/24/2025',
  amount: '$1100.00',
  balance: '$0.00',
  status: 'PAID'
}];

export function RecentInvoices() {
  return (
    <motion.section
      initial={{
        opacity: 0,
        y: 20
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        duration: 0.5,
        delay: 0.6
      }}
      className="mt-10 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

      <div className="p-6 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Recent Invoices</h2>
        <button className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors">
          View All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Invoice #
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Balance
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((invoice) =>
            <tr
              key={invoice.id}
              className="group hover:bg-gray-50 transition-colors">

                <td className="px-6 py-4 text-sm font-medium text-gray-900 font-mono">
                  {invoice.id}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {invoice.date}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {invoice.amount}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {invoice.balance}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 border border-teal-200">
                    {invoice.status}
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.section>);

}