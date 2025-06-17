import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Key, User, ExternalLink, CheckCircle } from 'lucide-react';
import { CloudflareConfig } from '../../types';

interface ConfigFormProps {
  onConfigSave: (config: CloudflareConfig) => void;
  initialConfig?: CloudflareConfig;
}

const ConfigForm: React.FC<ConfigFormProps> = ({ onConfigSave, initialConfig }) => {
  const [config, setConfig] = useState<CloudflareConfig>({
    accountId: '',
    apiToken: '',
  });
  const [showApiToken, setShowApiToken] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  useEffect(() => {
    setIsValid(config.accountId.trim().length > 0 && config.apiToken.trim().length > 0);
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    
    // Add a small delay to show the loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onConfigSave({
      accountId: config.accountId.trim(),
      apiToken: config.apiToken.trim(),
    });
    
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-2">
            Account ID
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="accountId"
              value={config.accountId}
              onChange={(e) => setConfig(prev => ({ ...prev, accountId: e.target.value }))}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your Cloudflare Account ID"
              required
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Found in your Cloudflare dashboard sidebar
          </p>
        </div>

        <div>
          <label htmlFor="apiToken" className="block text-sm font-medium text-gray-700 mb-2">
            API Token
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showApiToken ? 'text' : 'password'}
              id="apiToken"
              value={config.apiToken}
              onChange={(e) => setConfig(prev => ({ ...prev, apiToken: e.target.value }))}
              className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your Cloudflare API Token"
              required
            />
            <button
              type="button"
              onClick={() => setShowApiToken(!showApiToken)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-50 rounded-r-lg transition-colors"
            >
              {showApiToken ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Create a token with 'Cloudflare Stream:Edit' permissions
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            How to get your credentials:
          </h4>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>
              <a 
                href="https://dash.cloudflare.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
              >
                Log in to your Cloudflare dashboard
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </li>
            <li>Copy your Account ID from the right sidebar</li>
            <li>
              Go to{' '}
              <a 
                href="https://dash.cloudflare.com/profile/api-tokens" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
              >
                "My Profile" → "API Tokens"
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </li>
            <li>Create a custom token with "Cloudflare Stream:Edit" permissions</li>
            <li>Include your account in the "Account Resources" section</li>
          </ol>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
              isValid && !isSubmitting
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ConfigForm;