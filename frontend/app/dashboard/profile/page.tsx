'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Camera, Save, User, Mail, Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { getMe, updateMe } from '@/lib/api'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ProfilePage() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    fullname: '',
    first_name: '',
    last_name: '',
    email: '',
    role: '',
    password: '',
    confirm_password: '',
  })
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      const res = await getMe()
      const user = res.data
      setFormData({
        fullname: user.fullname || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        role: user.role || '',
        password: '',
        confirm_password: '',
      })
      if (user.photo) {
        const url = user.photo.startsWith('http') ? user.photo : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${user.photo}`
        setAvatarUrl(url)
      }
    } catch (err: any) {
      setError(t('error_loading_profile') || 'Failed to load profile parameters.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setPhotoFile(file)
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (formData.password && formData.password !== formData.confirm_password) {
      setError(t('passwords_do_not_match') || 'Passwords do not match.')
      return
    }

    setSaving(true)
    try {
      const data = new FormData()
      data.append('fullname', formData.fullname)
      data.append('first_name', formData.first_name)
      data.append('last_name', formData.last_name)
      
      // Email updates might be restricted on the backend. Including anyway.
      if (formData.email) data.append('email', formData.email)
      
      if (formData.password) {
        data.append('password', formData.password)
      }
      if (photoFile) {
        data.append('photo', photoFile)
      }

      await updateMe(data)
      setSuccess(true)
      
      // Refresh local data
      fetchUserData()
      
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.email?.[0] || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('my_profile') || 'My Profile'}</h1>
        <p className="text-slate-500 mt-2">{t('manage_profile_desc') || 'Manage your account settings and preferences.'}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm">{t('profile_updated') || 'Profile successfully updated!'}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 pb-10 border-b border-slate-100 flex flex-col md:flex-row gap-8 items-start md:items-center">
            
            {/* Avatar Section */}
            <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-slate-100 flex flex-col items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-slate-400" />
                )}
              </div>
              <button 
                type="button"
                onClick={handlePhotoClick}
                className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-full shadow-md transition-colors border-2 border-white"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoChange} 
                className="hidden" 
                accept="image/png, image/jpeg" 
              />
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900">{formData.fullname || 'User'}</h2>
              <div className="flex items-center gap-2 text-slate-500 mt-1">
                <Shield className="w-4 h-4" />
                <span className="font-medium capitalize">{formData.role}</span>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2">{t('personal_information') || 'Personal Information'}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">{t('full_name') || 'Full Name'}</label>
                <input 
                  type="text" 
                  name="fullname" 
                  value={formData.fullname} 
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">{t('email_address') || 'Email Address'}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    type="email" 
                    name="email" 
                    value={formData.email} 
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="user@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">{t('first_name') || 'First Name'}</label>
                <input 
                  type="text" 
                  name="first_name" 
                  value={formData.first_name} 
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="John"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">{t('last_name') || 'Last Name'}</label>
                <input 
                  type="text" 
                  name="last_name" 
                  value={formData.last_name} 
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="Doe"
                />
              </div>
            </div>

            <h3 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2 pt-6">{t('change_password') || 'Change Password'}</h3>
            <p className="text-sm text-slate-500">{t('leave_password_blank') || 'Leave fields blank if you do not wish to change your password.'}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">{t('new_password') || 'New Password'}</label>
                <input 
                  type="password" 
                  name="password" 
                  value={formData.password} 
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">{t('confirm_password') || 'Confirm Password'}</label>
                <input 
                  type="password" 
                  name="confirm_password" 
                  value={formData.confirm_password} 
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-colors"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('saving') || 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {t('save_changes') || 'Save Changes'}
                </>
              )}
            </button>
          </div>

        </div>
      </form>
    </div>
  )
}
