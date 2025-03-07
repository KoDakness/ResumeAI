import React, { useEffect, useState } from 'react';
import { FileText, Clock, CheckCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { AnalysisResult } from '../lib/analysis';

type Resume = {
  id: string;
  file_name: string;
  download_url: string | null;
  analysis_type: string;
  analysis_result: {
    status: string;
    summary?: AnalysisResult;
  } | null;
  created_at: string;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [usage, setUsage] = useState<{ free_reviews_used: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch resumes
      const { data: resumeData, error: resumeError } = await supabase
        .from('resumes')
        .select(`
          id,
          file_name,
          download_url,
          analysis_type,
          analysis_result,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (!resumeError && resumeData) {
        setResumes(resumeData);
      }

      // Fetch usage
      const { data: usageData, error: usageError } = await supabase
        .from('review_usage')
        .select('free_reviews_used')
        .eq('user_id', user.id)
        .single();

      if (!usageError && usageData) {
        setUsage(usageData);
      }
      
      setLoading(false);
    };
    
    fetchData();

    // Subscribe to changes
    const channel = supabase
      .channel('resume_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'resumes' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user, refreshKey]);

  const handleDelete = async (resumeId: string) => {
    try {
      setDeleting(resumeId);

      // Delete the resume record (this will cascade delete analysis_results)
      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resumeId);

      if (error) throw error;

      setResumes(resumes.filter(resume => resume.id !== resumeId));
    } catch (error) {
      console.error('Error deleting resume:', error);
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (resume: Resume) => {
    if (!resume.download_url) {
      // Generate download URL
      const { data: { publicUrl }, error } = await supabase.storage
        .from('resumes')
        .getPublicUrl(resume.file_path);

      if (error) {
        console.error('Error generating download URL:', error);
        return;
      }

      // Update resume with download URL
      const { error: updateError } = await supabase
        .from('resumes')
        .update({ download_url: publicUrl })
        .eq('id', resume.id);

      if (updateError) {
        console.error('Error updating download URL:', updateError);
        return;
      }

      window.open(publicUrl, '_blank');
    } else {
      window.open(resume.download_url, '_blank');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Reviews</h2>
            <FileText className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="space-y-6">
            {loading ? (
              <p className="text-gray-600">Loading...</p>
            ) : resumes.length === 0 ? (
              <p className="text-gray-600">No reviews yet. Upload your resume to get started!</p>
            ) : (
              resumes.map((resume) => (
                <div key={resume.id} className="border-b pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{resume.file_name}</h3>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-500">
                          {new Date(resume.created_at).toLocaleDateString()}
                        </span>
                        {resume.analysis_result?.status === 'completed' && resume.analysis_result.summary && <>
                          <button
                            onClick={() => setSelectedResume(resume)}
                            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                            title="View detailed analysis"
                          >
                            View Analysis
                          </button>
                          <button
                            onClick={() => handleDownload(resume)}
                            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium ml-3"
                            title="Download resume analysis"
                          >
                            Download
                          </button>
                        </>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDelete(resume.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1.5"
                        disabled={deleting === resume.id}
                      >
                        {deleting === resume.id ? (
                          <Clock className="h-5 w-5 animate-spin" />
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {resume.analysis_result?.status === 'completed' && resume.analysis_result.summary ? (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        <span>Analysis complete - Score: {resume.analysis_result.summary?.score}%</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        <span>Processing...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Subscription Status</h2>
            <Clock className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="space-y-4">
            <p className="text-gray-600">Free Plan</p>
            <button className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors">
              Upgrade to Premium
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Usage</h2>
            <CheckCircle className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Free Reviews</span>
              <span className="font-semibold">{usage?.free_reviews_used || 0}/3</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full" 
                style={{ width: `${((usage?.free_reviews_used || 0) / 3) * 100}%` }}
              ></div>
            </div>
            {usage?.free_reviews_used === 3 && (
              <p className="text-sm text-red-600">
                You've used all your free reviews. Upgrade to continue analyzing resumes.
              </p>
            )}
          </div>
        </div>
      </div>
      
      {selectedResume && selectedResume.analysis_result?.summary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Chat with AI about {selectedResume.file_name}
              </h3>
              <button
                onClick={() => setSelectedResume(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-6">
                {/* Introduction Message */}
                <div className="flex items-start space-x-4">
                  <div className="bg-indigo-100 rounded-full p-2 mt-1">
                    <FileText className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1 bg-indigo-50 rounded-2xl p-4 chat-bubble-left">
                    <p className="text-gray-800">
                      {selectedResume.analysis_result.summary.messages.intro}
                    </p>
                  </div>
                </div>

                {/* Score Display */}
                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 rounded-full p-2 mt-1">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1 bg-green-50 rounded-2xl p-4 chat-bubble-left">
                      <p className="text-gray-800 mb-3">
                        Based on my analysis, your resume scores {selectedResume.analysis_result.summary.score}%
                        overall. Here's a detailed breakdown of your resume's performance:
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                        <div
                          className="bg-green-600 h-3 rounded-full transition-all duration-500"
                          style={{
                            width: `${selectedResume.analysis_result.summary.score}%`
                          }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <h4 className="font-medium text-gray-700">Skills Analysis</h4>
                          <p className="text-sm text-gray-600">
                            {selectedResume.analysis_result.summary.details?.skills.length} relevant skills identified
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-700">Experience Impact</h4>
                          <p className="text-sm text-gray-600">
                            {selectedResume.analysis_result.summary.details?.experience.impact}% impact score
                          </p>
                        </div>
                      </div>
                  </div>
                </div>

                {/* ATS Analysis */}
                <div className="flex items-start space-x-4">
                  <div className="bg-blue-100 rounded-full p-2 mt-1">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 bg-blue-50 rounded-2xl p-4 chat-bubble-left">
                    <p className="text-gray-800">
                      {selectedResume.analysis_result.summary.messages.ats}
                    </p>
                  </div>
                </div>

                {/* Impact Analysis */}
                <div className="flex items-start space-x-4">
                  <div className="bg-purple-100 rounded-full p-2 mt-1">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1 bg-purple-50 rounded-2xl p-4 chat-bubble-left">
                    <p className="text-gray-800">
                      {selectedResume.analysis_result.summary.messages.impact}
                    </p>
                  </div>
                </div>

                {/* Clarity Analysis */}
                <div className="flex items-start space-x-4">
                  <div className="bg-amber-100 rounded-full p-2 mt-1">
                    <FileText className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="flex-1 bg-amber-50 rounded-2xl p-4 chat-bubble-left">
                    <p className="text-gray-800">
                      {selectedResume.analysis_result.summary.messages.clarity}
                    </p>
                  </div>
                </div>
                
                {/* Skills Analysis */}
                <div className="flex items-start space-x-4">
                  <div className="bg-emerald-100 rounded-full p-2 mt-1">
                    <FileText className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 bg-emerald-50 rounded-2xl p-4 chat-bubble-left">
                    <p className="text-gray-800">
                      {selectedResume.analysis_result.summary.messages.skills}
                    </p>
                  </div>
                </div>

                {/* Experience Analysis */}
                <div className="flex items-start space-x-4">
                  <div className="bg-violet-100 rounded-full p-2 mt-1">
                    <FileText className="h-6 w-6 text-violet-600" />
                  </div>
                  <div className="flex-1 bg-violet-50 rounded-2xl p-4 chat-bubble-left">
                    <p className="text-gray-800">
                      {selectedResume.analysis_result.summary.messages.experience}
                    </p>
                  </div>
                </div>

                {/* Action Plan */}
                <div className="flex items-start space-x-4">
                  <div className="bg-orange-100 rounded-full p-2 mt-1">
                    <FileText className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1 bg-orange-50 rounded-2xl p-4 chat-bubble-left">
                    <h4 className="font-medium text-gray-900 mb-2">Your Action Plan</h4>
                    <div className="whitespace-pre-line text-gray-800">
                      {selectedResume.analysis_result.summary.messages.action_plan}
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="mt-8">
              <button
                onClick={() => setSelectedResume(null)}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl hover:bg-indigo-700 transition-colors font-medium"
              >
                Close Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}