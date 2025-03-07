import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { extractTextFromFile } from '../lib/fileUtils';
import { analyzeResume } from '../lib/analysis';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ free_reviews_used: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('review_usage')
        .select('free_reviews_used')
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setUsage(data);
      }
    };

    fetchUsage();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }
    
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        setError('Please sign in to upload a resume');
        return;
      }

      // Create review usage record if it doesn't exist
      const { error: upsertError } = await supabase
        .from('review_usage')
        .upsert(
          { user_id: user.id, free_reviews_used: 0 },
          { onConflict: 'user_id' }
        );

      if (upsertError) {
        console.error('Error upserting usage:', upsertError);
      }

      // Check free review limit
      const { data: usage, error: usageError } = await supabase
        .from('review_usage')
        .select('free_reviews_used')
        .eq('user_id', user.id)
        .single();

      if (usageError) {
        console.error('Error fetching usage:', usageError);
        throw new Error('Failed to check review limit');
      }

      if (usage && usage.free_reviews_used >= 3) {
        setError('You have used all your free reviews. Please upgrade to continue.');
        return;
      }

      setUploading(true);
      setError(null);
      setAnalysisStatus('Uploading file...');

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upsert profile (create if not exists, do nothing if exists)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          { id: user.id, email: user.email },
          { onConflict: 'id' }
        );

      if (profileError) throw profileError;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;

      setAnalysisStatus('Analyzing resume content...');
      
      // Extract text from the uploaded file
      const text = await extractTextFromFile(file);
      if (!text) {
        throw new Error('Could not extract text from file');
      }

      // Analyze resume
      try {
        const analysisContent = await analyzeResume(text);
        
        setAnalysisStatus('Saving results...');
        const { error: dbError } = await supabase.from('resumes').insert({
          file_path: filePath,
          file_name: file.name,
          analysis_type: 'free',
          user_id: user.id,
          analysis_result: { 
            status: 'completed', 
            summary: {
              score: analysisContent.score,
              strengths: analysisContent.strengths,
              improvements: analysisContent.improvements,
              details: analysisContent.details,
              messages: analysisContent.messages
            }
          } 
        });

        if (dbError) {
          console.error('Database error:', dbError);
          throw new Error('Failed to save analysis results');
        }

        // Navigate to dashboard after a short delay
        setAnalysisStatus('Analysis complete! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 1000);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to analyze resume';
        console.error('Analysis error:', errorMessage);
        
        // Create resume with error status
        const { error: errorStatusError } = await supabase.from('resumes').insert({
          file_path: filePath,
          file_name: file.name,
          analysis_type: 'free',
          user_id: user.id,
          analysis_result: { 
            status: 'error'
          } 
        });
        
        if (errorStatusError) {
          console.error('Failed to save error status:', errorStatusError);
        }
        
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      setAnalysisStatus('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Upload Your Resume</h1>
      
      <div className="bg-white rounded-lg shadow-sm p-6 relative">
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">Processing Resume</span>
                <span className="text-sm text-gray-600">{analysisStatus}</span>
              </div>
            </div>
          </div>
        )}

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
          <div className="text-center">
            <Upload className={`mx-auto h-12 w-12 ${file ? 'text-indigo-600' : 'text-gray-400'}`} />
            <div className="mt-4">
              <label
                htmlFor="file-upload"
                className="cursor-pointer bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors inline-block"
              >
                {file ? 'Change File' : 'Select File'}
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".txt,.rtf,.pdf"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            {file ? (
              <p className="mt-2 text-sm text-indigo-600">{file.name}</p>
            ) : (
              <p className="mt-2 text-sm text-gray-500">PDF, TXT, or RTF files up to 10MB</p>
            )}
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className={`bg-indigo-600 text-white py-2 px-6 rounded-md hover:bg-indigo-700 transition-colors
              ${(!file || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Submit for Review
          </button>
        </div>

        <div className="mt-6">
          <div className="bg-blue-50 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Free Analysis ({usage ? 3 - usage.free_reviews_used : '...'} remaining):
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Basic ATS compatibility check</li>
                    <li>3 key improvement suggestions</li>
                    <li>Format and structure review</li>
                    <li>Downloadable analysis report</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}