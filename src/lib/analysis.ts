type SkillAnalysis = {
  skill: string;
  level: 'expert' | 'proficient' | 'familiar';
  context: string;
  suggestion?: string;
};

type ExperienceAnalysis = {
  impact: number;
  metrics: boolean;
  leadership: boolean;
  achievements: boolean;
  suggestions: string[];
};

type KeywordAnalysis = {
  found: string[];
  missing: string[];
  frequency: Record<string, number>;
};

type FormatAnalysis = {
  structure: {
    hasProperSections: boolean;
    sectionsFound: string[];
    missingSections: string[];
  };
  length: {
    appropriate: boolean;
    wordCount: number;
    suggestion?: string;
  };
  readability: {
    score: number;
    issues: string[];
  };
};

export type AnalysisResult = {
  score: number;
  strengths: string[];
  improvements: string[];
  details: {
    skills: SkillAnalysis[];
    experience: ExperienceAnalysis;
    keywords: KeywordAnalysis;
    format: FormatAnalysis;
  };
  messages: {
    intro: string;
    ats: string;
    impact: string;
    clarity: string;
    skills: string;
    experience: string;
    action_plan: string;
  };
};

const COMMON_SKILLS = {
  technical: [
    'JavaScript', 'Python', 'Java', 'C\\+\\+', 'React', 'Angular', 'Vue',
    'Node.js', 'AWS', 'Docker', 'Kubernetes', 'SQL', 'NoSQL', 'Git',
    'CI/CD', 'REST API', 'GraphQL', 'Machine Learning', 'Agile'
  ],
  soft: [
    'Leadership', 'Communication', 'Problem Solving', 'Team Management',
    'Project Management', 'Time Management', 'Critical Thinking',
    'Collaboration', 'Adaptability', 'Innovation'
  ]
};

const IMPACT_VERBS = [
  'achieved', 'improved', 'increased', 'decreased', 'reduced',
  'developed', 'launched', 'led', 'managed', 'created',
  'implemented', 'designed', 'optimized', 'streamlined'
];

function analyzeSkills(text: string): SkillAnalysis[] {
  const skills: SkillAnalysis[] = [];
  const allSkills = [...COMMON_SKILLS.technical, ...COMMON_SKILLS.soft];

  try {
    allSkills.forEach(skill => {
      // Escape special regex characters
      const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSkill, 'gi');
      const matches = text.match(regex);
      
      if (matches) {
        const context = text.split(/\n+/).find(line => 
          line.toLowerCase().includes(skill.toLowerCase())
        ) || '';
        const frequency = matches.length;
        
        skills.push({
          skill,
          level: frequency > 2 ? 'expert' : frequency > 1 ? 'proficient' : 'familiar',
          context: context.trim(),
          suggestion: frequency === 1 ? 'Consider adding more context about your experience with this skill' : undefined
        });
      }
    });
  } catch (error) {
    console.error('Error in skills analysis:', error);
    // Return empty skills array rather than failing completely
    return [];
  }

  return skills;
}

function analyzeExperience(text: string): ExperienceAnalysis {
  const experienceSection = text.match(/(?:EXPERIENCE|WORK|EMPLOYMENT)(.*?)(?:\n\n|\n[A-Z])/s)?.[1] || '';
  
  const hasMetrics = /\d+%|\$\d+|\d+ (users|customers|clients|projects|teams?|people|employees)/i.test(experienceSection);
  const hasLeadership = /(led|managed|supervised|mentored|directed|coordinated) (team|project|initiative)/i.test(experienceSection);
  const impactVerbs = IMPACT_VERBS.filter(verb => new RegExp(`\\b${verb}\\b`, 'i').test(experienceSection));
  
  const suggestions = [];
  if (!hasMetrics) suggestions.push('Add specific metrics and quantifiable achievements');
  if (!hasLeadership) suggestions.push('Highlight leadership and project management experiences');
  if (impactVerbs.length < 3) suggestions.push('Use more impactful action verbs to describe your achievements');

  return {
    impact: Math.min(100, impactVerbs.length * 20),
    metrics: hasMetrics,
    leadership: hasLeadership,
    achievements: impactVerbs.length > 0,
    suggestions
  };
}

function analyzeKeywords(text: string): KeywordAnalysis {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const frequency: Record<string, number> = {};
  
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  const found = Object.entries(frequency)
    .filter(([word]) => IMPACT_VERBS.includes(word))
    .map(([word]) => word);

  const missing = IMPACT_VERBS.filter(verb => !found.includes(verb));

  return { found, missing, frequency };
}

function analyzeFormat(text: string): FormatAnalysis {
  const sections = ['SUMMARY', 'EXPERIENCE', 'EDUCATION', 'SKILLS'];
  const foundSections = sections.filter(section => 
    new RegExp(section, 'i').test(text)
  );

  const wordCount = (text.match(/\b\w+\b/g) || []).length;
  
  return {
    structure: {
      hasProperSections: foundSections.length >= 3,
      sectionsFound: foundSections,
      missingSections: sections.filter(s => !foundSections.includes(s))
    },
    length: {
      appropriate: wordCount >= 300 && wordCount <= 700,
      wordCount,
      suggestion: wordCount < 300 ? 'Add more detailed content' :
                 wordCount > 700 ? 'Consider making content more concise' : undefined
    },
    readability: {
      score: Math.min(100, Math.floor(wordCount / 7)),
      issues: []
    }
  };
}

export async function analyzeResume(text: string): Promise<AnalysisResult> {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid resume content');
    }

    const skillsAnalysis = analyzeSkills(text);
    const experienceAnalysis = analyzeExperience(text);
    const keywordAnalysis = analyzeKeywords(text);
    const formatAnalysis = analyzeFormat(text);

    const strengths = [];
    const improvements = [];
    
    // Calculate overall score
    const scores = {
      skills: Math.min(100, (skillsAnalysis.length / 10) * 100),
      experience: experienceAnalysis.impact,
      keywords: Math.min(100, (keywordAnalysis.found.length / IMPACT_VERBS.length) * 100),
      format: formatAnalysis.readability.score
    }
    const score = Math.floor(Object.values(scores).reduce((a, b) => a + b, 0) / 4);

    // Add top skills to strengths
    const expertSkills = skillsAnalysis.filter(s => s.level === 'expert');
    if (expertSkills.length > 0) {
      strengths.push(`Strong expertise in ${expertSkills.map(s => s.skill).join(', ')}`);
    }

    // Add format strengths
    if (formatAnalysis.structure.hasProperSections) {
      strengths.push('Well-structured with clear sections');
    }

    // Add experience strengths
    if (experienceAnalysis.metrics) {
      strengths.push('Effective use of metrics to demonstrate impact');
    }

    // Add all improvement suggestions
    improvements.push(...experienceAnalysis.suggestions);
    improvements.push(...skillsAnalysis
      .filter(s => s.suggestion)
      .map(s => s.suggestion as string)
    );

    if (keywordAnalysis.missing.length > 0) {
      improvements.push(`Consider incorporating impactful words like: ${keywordAnalysis.missing.slice(0, 3).join(', ')}`);
    }

    if (strengths.length === 0) {
      strengths.push('Basic resume structure detected');
    }

    if (improvements.length === 0) {
      improvements.push('Focus on adding more specific achievements and metrics');
    }

    return {
      score,
      strengths,
      improvements,
      details: {
        skills: skillsAnalysis,
        experience: experienceAnalysis,
        keywords: keywordAnalysis,
        format: formatAnalysis
      },
      messages: {
        intro: `I've completed a comprehensive analysis of your resume, achieving an overall score of ${score}%. Let's dive into the detailed breakdown and specific recommendations for improvement.`,
        ats: `Your resume contains ${keywordAnalysis.found.length} impactful keywords out of our recommended set. ${keywordAnalysis.found.length > 5 ? 'This is good for ATS optimization!' : 'Consider incorporating more industry-standard terms for better ATS performance.'} ${formatAnalysis.structure.hasProperSections ? 'The clear section structure will help with automated parsing.' : 'Adding clear section headers will improve ATS readability.'}`,
        impact: `Your experience section ${experienceAnalysis.metrics ? 'effectively uses' : 'could benefit from'} quantifiable achievements. ${experienceAnalysis.leadership ? 'Leadership experience is well-highlighted.' : 'Consider emphasizing leadership roles and responsibilities.'} Impact score: ${experienceAnalysis.impact}%`,
        clarity: `Document structure is ${formatAnalysis.structure.hasProperSections ? 'well-organized' : 'needs improvement'}. Length is ${formatAnalysis.length.appropriate ? 'appropriate' : 'not optimal'} at ${formatAnalysis.length.wordCount} words. ${formatAnalysis.length.suggestion || ''}`,
        skills: `You've demonstrated ${skillsAnalysis.length} relevant skills, with particular strength in ${skillsAnalysis.filter(s => s.level === 'expert').map(s => s.skill).slice(0, 3).join(', ')}. ${skillsAnalysis.filter(s => s.level === 'familiar').length > 0 ? 'Consider expanding on your experience with ' + skillsAnalysis.filter(s => s.level === 'familiar').map(s => s.skill).slice(0, 2).join(', ') : ''}`,
        experience: `Your experience section ${experienceAnalysis.achievements ? 'effectively showcases' : 'needs stronger'} achievements. ${experienceAnalysis.metrics ? 'Good use of metrics!' : 'Add specific numbers and percentages to quantify your impact.'} ${experienceAnalysis.leadership ? 'Leadership experience is well-documented.' : 'Consider highlighting team leadership and project management experiences.'}`,
        action_plan: `Priority improvements:\n1. ${improvements[0]}\n2. ${improvements[1] || 'Continue maintaining current strengths'}\n3. ${improvements[2] || 'Focus on quantifying achievements'}`
      }
    };
  } catch (error) {
    console.error('Error analyzing resume:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to analyze resume');
  }
}