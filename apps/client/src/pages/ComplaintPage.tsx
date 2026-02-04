/**
 * Complaint Page
 * Customer complaint submission form
 */

import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../lib/api';

const complaintTypes = [
  { id: 'product_not_dispensed', labelKey: 'complaintProductNotDispensed', icon: '💰' },
  { id: 'product_defective', labelKey: 'complaintProductDefective', icon: '⚠️' },
  { id: 'product_not_available', labelKey: 'complaintProductNotAvailable', icon: '❌' },
  { id: 'payment_issue', labelKey: 'complaintPaymentIssue', icon: '💳' },
  { id: 'machine_malfunction', labelKey: 'complaintMachineMalfunction', icon: '🔧' },
  { id: 'machine_dirty', labelKey: 'complaintMachineDirty', icon: '🧹' },
  { id: 'other', labelKey: 'complaintOther', icon: '💬' },
];

export function ComplaintPage() {
  const { machineId } = useParams();
  useSearchParams(); // URL params available for future use
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [step, setStep] = useState<'type' | 'details' | 'contact' | 'success'>('type');
  const [complaintType, setComplaintType] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);

  // Get machine info
  const { data: machine, isLoading } = useQuery({
    queryKey: ['machine', machineId],
    queryFn: () => api.get(`/machines/${machineId}`).then((res) => res.data.data),
    enabled: !!machineId,
  });

  // Submit complaint
  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('machineId', machineId!);
      formData.append('complaintType', complaintType);
      formData.append('description', description);
      formData.append('customerPhone', phone);
      if (email) formData.append('customerEmail', email);
      if (photo) formData.append('photo', photo);

      return api.post('/complaints/public/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      setStep('success');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t('errorSending'));
    },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {step !== 'success' && (
              <button
                onClick={() => {
                  if (step === 'details') setStep('type');
                  else if (step === 'contact') setStep('details');
                  else navigate(-1);
                }}
                className="p-2 -ml-2 text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-xl font-bold">{t('complaint')}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Machine Info */}
        {machine && step !== 'success' && (
          <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">☕</span>
              </div>
              <div>
                <h2 className="font-semibold">{machine.name}</h2>
                <p className="text-sm text-gray-500">#{machine.machineNumber}</p>
                {machine.address && (
                  <p className="text-xs text-gray-400 mt-1">{machine.address}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step: Select Type */}
        {step === 'type' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">{t('selectProblemType')}</h2>
            <div className="space-y-3">
              {complaintTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setComplaintType(type.id);
                    setStep('details');
                  }}
                  className="w-full flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <span className="text-2xl">{type.icon}</span>
                  <span className="font-medium">{t(type.labelKey)}</span>
                  <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Details */}
        {step === 'details' && (
          <div>
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 text-sm bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
                {complaintTypes.find((ct) => ct.id === complaintType)?.icon}
                {t(complaintTypes.find((ct) => ct.id === complaintType)?.labelKey || '')}
              </span>
            </div>

            <h2 className="text-lg font-semibold mb-4">{t('describeIssue')}</h2>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('describeWhatHappened')}
              className="w-full h-32 p-4 bg-white rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
            />

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">{t('addPhotoOptional')}</label>
              <label className="flex items-center justify-center gap-2 h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-500 transition-colors">
                {photo ? (
                  <span className="text-green-600">✓ {t('photoAdded')}</span>
                ) : (
                  <>
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-gray-500">{t('addPhoto')}</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>

            <button
              onClick={() => setStep('contact')}
              disabled={!description.trim()}
              className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('next')}
            </button>
          </div>
        )}

        {/* Step: Contact */}
        {step === 'contact' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">{t('contactDetails')}</h2>
            <p className="text-gray-500 mb-6">{t('providePhoneForFeedback')}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('phoneRequired')}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full p-4 bg-white rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">{t('emailOptional')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full p-4 bg-white rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <button
              onClick={() => submitMutation.mutate()}
              disabled={!phone.trim() || submitMutation.isPending}
              className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {t('sending')}
                </>
              ) : (
                t('submitComplaint')
              )}
            </button>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">{t('complaintSentTitle')}</h2>
            <p className="text-gray-500 mb-8">
              {t('complaintSentDescription')}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium"
            >
              {t('goHome')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
