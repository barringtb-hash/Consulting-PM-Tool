/**
 * Alerts Management Page
 *
 * Configure alert rules and view alert history.
 */

import React, { useState, useCallback } from 'react';
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Mail,
  MessageSquare,
  Send,
  Settings,
} from 'lucide-react';
import { Card, Badge, Button, Input, Modal } from '../../ui';
import {
  useAlertRules,
  useCreateAlertRule,
  useUpdateAlertRule,
  useDeleteAlertRule,
  useTestAlert,
  useAlertHistory,
  useSendDailyDigest,
  AlertRule,
} from '../../api/hooks/useMonitoring';

function getChannelIcon(channel: string) {
  switch (channel) {
    case 'EMAIL':
      return <Mail className="w-4 h-4" />;
    case 'SLACK':
      return <MessageSquare className="w-4 h-4" />;
    case 'IN_APP':
      return <Bell className="w-4 h-4" />;
    default:
      return <Send className="w-4 h-4" />;
  }
}

function AlertRuleModal({
  rule,
  isOpen,
  onClose,
  onSave,
}: {
  rule: Partial<AlertRule> | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<AlertRule>) => void;
}) {
  // PERF FIX: Default form state extracted to avoid recreation
  const defaultFormState: Partial<AlertRule> = {
    name: '',
    description: '',
    enabled: true,
    severity: ['CRITICAL', 'HIGH'],
    category: ['COST', 'USAGE', 'PERFORMANCE', 'HEALTH'],
    channel: 'EMAIL',
    recipients: [],
    throttleMinutes: 60,
  };

  const [formData, setFormData] = useState<Partial<AlertRule>>(
    rule || defaultFormState,
  );
  const [recipientInput, setRecipientInput] = useState('');

  React.useEffect(() => {
    if (rule) {
      setFormData(rule);
    } else {
      setFormData(defaultFormState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule, isOpen]);

  // PERF FIX: Memoized form field handler to prevent re-renders
  const handleFieldChange = useCallback(
    (field: keyof AlertRule, value: unknown) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleAddRecipient = useCallback(() => {
    if (recipientInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        recipients: [...(prev.recipients || []), recipientInput.trim()],
      }));
      setRecipientInput('');
    }
  }, [recipientInput]);

  const handleRemoveRecipient = useCallback((index: number) => {
    setFormData((prev) => {
      const newRecipients = [...(prev.recipients || [])];
      newRecipients.splice(index, 1);
      return { ...prev, recipients: newRecipients };
    });
  }, []);

  const handleToggleSeverity = useCallback((severity: string) => {
    setFormData((prev) => {
      const current = prev.severity || [];
      if (current.includes(severity)) {
        return { ...prev, severity: current.filter((s) => s !== severity) };
      } else {
        return { ...prev, severity: [...current, severity] };
      }
    });
  }, []);

  const handleToggleCategory = useCallback((category: string) => {
    setFormData((prev) => {
      const current = prev.category || [];
      if (current.includes(category)) {
        return { ...prev, category: current.filter((c) => c !== category) };
      } else {
        return { ...prev, category: [...current, category] };
      }
    });
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={rule?.id ? 'Edit Alert Rule' : 'Create Alert Rule'}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">
            Name
          </label>
          <Input
            value={formData.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="Alert rule name"
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">
            Description
          </label>
          <Input
            value={formData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Optional description"
          />
        </div>

        <div>
          <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-2">
            Severity Filters
          </label>
          <div className="flex flex-wrap gap-2">
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => (
              <button
                key={severity}
                onClick={() => handleToggleSeverity(severity)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  formData.severity?.includes(severity)
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {severity}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-2">
            Category Filters
          </label>
          <div className="flex flex-wrap gap-2">
            {['COST', 'USAGE', 'PERFORMANCE', 'HEALTH'].map((category) => (
              <button
                key={category}
                onClick={() => handleToggleCategory(category)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  formData.category?.includes(category)
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">
            Channel
          </label>
          <select
            value={formData.channel || 'EMAIL'}
            onChange={(e) => handleFieldChange('channel', e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
          >
            <option value="EMAIL">Email</option>
            <option value="SLACK">Slack</option>
            <option value="IN_APP">In-App</option>
            <option value="WEBHOOK">Webhook</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">
            Recipients
          </label>
          <div className="flex gap-2">
            <Input
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              placeholder={
                formData.channel === 'EMAIL' ? 'email@example.com' : 'Recipient'
              }
              onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
            />
            <Button onClick={handleAddRecipient} variant="outline">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(formData.recipients || []).map((recipient, index) => (
              <Badge key={index} variant="default" className="gap-1">
                {recipient}
                <button
                  onClick={() => handleRemoveRecipient(index)}
                  className="ml-1 hover:text-red-500"
                >
                  <XCircle className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-neutral-600 dark:text-neutral-400 mb-1">
            Throttle (minutes between alerts)
          </label>
          <Input
            type="number"
            value={formData.throttleMinutes || 60}
            onChange={(e) =>
              handleFieldChange('throttleMinutes', parseInt(e.target.value))
            }
            min={1}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled !== false}
            onChange={(e) => handleFieldChange('enabled', e.target.checked)}
            className="w-4 h-4 rounded border-neutral-300"
          />
          <label
            htmlFor="enabled"
            className="text-sm text-neutral-600 dark:text-neutral-400"
          >
            Rule enabled
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(formData)}>
            {rule?.id ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AlertsPage(): JSX.Element {
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  const { data: rules, isLoading: rulesLoading } = useAlertRules();
  const { data: history, isLoading: historyLoading } = useAlertHistory({
    limit: 50,
  });

  const createRule = useCreateAlertRule();
  const updateRule = useUpdateAlertRule();
  const deleteRule = useDeleteAlertRule();
  const testAlert = useTestAlert();
  const sendDigest = useSendDailyDigest();

  const _isLoading = rulesLoading || historyLoading;

  const handleSaveRule = async (data: Partial<AlertRule>) => {
    if (editingRule?.id) {
      await updateRule.mutateAsync({ id: editingRule.id, data });
    } else {
      await createRule.mutateAsync(data);
    }
    setShowRuleModal(false);
    setEditingRule(null);
  };

  const handleDeleteRule = async (id: string) => {
    if (confirm('Are you sure you want to delete this alert rule?')) {
      await deleteRule.mutateAsync(id);
    }
  };

  const handleTestAlert = async (id: string) => {
    const result = await testAlert.mutateAsync(id);
    alert(result.message);
  };

  return (
    <div className="page-content space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
            Alert Management
          </h1>
          <p className="text-neutral-500 mt-1">
            Configure alert rules and view notification history
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => sendDigest.mutate()}
            disabled={sendDigest.isPending}
            className="gap-2"
          >
            <Mail className="w-4 h-4" />
            Send Digest
          </Button>
          <Button
            onClick={() => {
              setEditingRule(null);
              setShowRuleModal(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Alert Rules */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-500" />
            Alert Rules
          </h2>
          {rulesLoading ? (
            <div className="h-48 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (rules?.data?.length || 0) > 0 ? (
            <div className="space-y-3">
              {rules?.data?.map((rule) => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    rule.enabled
                      ? 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800'
                      : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 opacity-60'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                    {getChannelIcon(rule.channel)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {rule.name}
                      </span>
                      {!rule.enabled && (
                        <Badge variant="default">Disabled</Badge>
                      )}
                    </div>
                    {rule.description && (
                      <div className="text-xs text-neutral-500 mt-1">
                        {rule.description}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rule.severity?.map((s) => (
                        <Badge key={s} variant="warning" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                      {rule.category?.map((c) => (
                        <Badge key={c} variant="default" className="text-xs">
                          {c}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-xs text-neutral-400 mt-2">
                      {rule.recipients?.length || 0} recipients •{' '}
                      {rule.throttleMinutes}min throttle
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestAlert(rule.id)}
                      disabled={testAlert.isPending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingRule(rule);
                        setShowRuleModal(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Bell className="w-12 h-12 text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">
                No Alert Rules
              </h3>
              <p className="text-neutral-500 mt-1 mb-4">
                Create your first alert rule to get notified
              </p>
              <Button
                onClick={() => {
                  setEditingRule(null);
                  setShowRuleModal(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Rule
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Alert History */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-500" />
            Alert History
          </h2>
          {historyLoading ? (
            <div className="h-48 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (history?.data?.length || 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Rule</th>
                    <th className="pb-2 font-medium">Channel</th>
                    <th className="pb-2 font-medium">Recipient</th>
                    <th className="pb-2 font-medium">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {history?.data?.map((alert) => (
                    <tr key={alert.id}>
                      <td className="py-2">
                        {alert.status === 'SENT' ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Sent
                          </Badge>
                        ) : alert.status === 'FAILED' ? (
                          <Badge variant="danger" className="gap-1">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="gap-1">
                            <Clock className="w-3 h-3" />
                            {alert.status}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 text-neutral-700 dark:text-neutral-300">
                        {alert.rule?.name || '--'}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                          {getChannelIcon(alert.channel)}
                          <span>{alert.channel}</span>
                        </div>
                      </td>
                      <td className="py-2 text-neutral-600 dark:text-neutral-400">
                        {alert.recipient}
                      </td>
                      <td className="py-2 text-neutral-500">
                        {new Date(alert.sentAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-neutral-500 py-8">
              No alerts have been sent yet
            </div>
          )}
        </div>
      </Card>

      {/* Rule Modal */}
      <AlertRuleModal
        rule={editingRule}
        isOpen={showRuleModal}
        onClose={() => {
          setShowRuleModal(false);
          setEditingRule(null);
        }}
        onSave={handleSaveRule}
      />
    </div>
  );
}

export default AlertsPage;
