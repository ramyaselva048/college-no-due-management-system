import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  User,
  Clock,
  Code
} from 'lucide-react';
import api from '../../services/api';
import { AuditLog } from '../../types';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/audit-logs');
      const list = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.logs) ? res.data.logs : []);
      setLogs(list);
    } catch (err) {
      console.error(err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const safeLogs = Array.isArray(logs) ? logs : [];

  const filteredLogs = safeLogs.filter((l) => {
    const matchesSearch =
      search === '' ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      l.entity_type?.toLowerCase().includes(search.toLowerCase());
    const matchesEntity =
      entityFilter === 'all' ||
      !entityFilter ||
      l.entity_type?.toLowerCase().includes(entityFilter.toLowerCase());
    return matchesSearch && matchesEntity;
  });

  const uniqueEntities = Array.from(new Set(safeLogs.map((l) => l.entity_type).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">
            System Security & Financial Audit Logs
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable trace of user actions, financial fee settlements, approvals, and certificate generation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              list="audit-entity-list"
              placeholder="Type entity type..."
              value={entityFilter === 'all' ? '' : entityFilter}
              onChange={(e) => setEntityFilter(e.target.value || 'all')}
              className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
            />
            <datalist id="audit-entity-list">
              <option value="all">All Entity Types</option>
              {uniqueEntities.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search audit trail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading audit trail...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <History className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No audit events recorded.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Operator</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="font-semibold">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="text-[10px] text-slate-400 font-mono ml-1">
                          #{log.entity_id}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[150px]">{log.user_email || 'System / Batch'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {log.ip_address || '127.0.0.1'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {(log.old_values || log.new_values) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-indigo-600 hover:text-indigo-800 font-bold text-xs"
                        >
                          Inspect Payload
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* JSON Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-600" /> Audit Payload Detail
            </h3>

            <div className="space-y-3 text-xs">
              {selectedLog.old_values && (
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Previous State:</span>
                  <pre className="p-3 bg-slate-50 rounded-lg text-slate-800 font-mono text-[11px] overflow-x-auto mt-1 border border-slate-200">
                    {selectedLog.old_values}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px]">New Modified State:</span>
                  <pre className="p-3 bg-slate-50 rounded-lg text-slate-800 font-mono text-[11px] overflow-x-auto mt-1 border border-slate-200">
                    {selectedLog.new_values}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
