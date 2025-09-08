'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Target, Calendar } from 'lucide-react';

// Helper functions available to all components
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'professional': return '👔';
    case 'technical': return '💻';
    case 'leadership': return '👑';
    case 'certification': return '📜';
    case 'education': return '🎓';
    case 'personal_development': return '🌱';
    default: return '🎯';
  }
};

interface CareerGoal {
  id: string;
  title: string;
  description: string;
  category: string;
  goal_type: string;
  priority: string;
  status: string;
  start_date: string;
  target_completion_date: string;
  actual_completion_date?: string;
  progress_percentage: number;
  current_status?: string;
  success_criteria?: string;
  measurement_method?: string;
  target_metric?: string;
  current_metric?: string;
  required_resources?: string;
  required_skills?: string[];
  mentor_id?: string;
  budget_allocated?: number;
  tags?: string[];
  notes?: string;
  employee?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  mentor?: {
    first_name: string;
    last_name: string;
  };
  milestones?: GoalMilestone[];
}

interface GoalMilestone {
  id: string;
  title: string;
  description?: string;
  target_date: string;
  actual_completion_date?: string;
  status: string;
  progress_percentage: number;
  deliverables?: string;
}

interface CareerGoalsManagerProps {
  employeeId?: string;
}

export default function CareerGoalsManager({ employeeId }: CareerGoalsManagerProps) {
  const [goals, setGoals] = useState<CareerGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<CareerGoal | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('in_progress');
  const [authRequired, setAuthRequired] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (employeeId) params.append('employee_id', employeeId);

      // Only fetch goals that are in_progress or completed
      if (activeTab === 'all') {
        // For "all" tab, include both in_progress and completed
        params.append('status', 'in_progress,completed');
      } else {
        params.append('status', activeTab);
      }

      const response = await fetch(`/api/career-goals?${params}`);

      if (!response.ok) {
        // Handle HTTP errors properly
        if (response.status === 401) {
          console.warn('Authentication required for career goals API');
          setAuthRequired(true);
          setGoals([]);
          return;
        } else if (response.status === 404) {
          console.warn('Employee record not found');
          setGoals([]);
          return;
        } else {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
      }

      const result = await response.json();

      if (result.error) {
        console.error('API returned error:', result.error);
        setGoals([]);
        return;
      }

      setGoals(result.data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId, activeTab]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);


  if (authRequired) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-4">
            Please sign in to view and manage career goals.
          </p>
          <Button onClick={() => window.location.href = '/auth/login'}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading career goals...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All Goals</TabsTrigger>
          </TabsList>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Start New Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Career Goal</DialogTitle>
                <DialogDescription>
                  Define a new career development objective
                </DialogDescription>
              </DialogHeader>
              <GoalForm onSuccess={() => {
                setIsCreateDialogOpen(false);
                fetchGoals();
              }} />
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value={activeTab} className="space-y-4">
          {goals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No career goals found</h3>
                <p className="text-gray-600 text-center mb-4">
                  {activeTab === 'all'
                    ? "No goals found. Start your first goal to get started!"
                    : `No ${activeTab.replace('_', ' ')} goals found`
                  }
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Start Your First Goal
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {goals.map((goal) => (
                <Card key={goal.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{getCategoryIcon(goal.category)}</span>
                        <div>
                          <CardTitle className="text-lg">{goal.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {goal.employee?.first_name} {goal.employee?.last_name}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={getStatusColor(goal.status)}>
                        {goal.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {goal.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{goal.progress_percentage}%</span>
                      </div>
                      <Progress value={goal.progress_percentage} className="h-2" />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className={getPriorityColor(goal.priority)}>
                        {goal.priority}
                      </Badge>
                      <Badge variant="outline">
                        {goal.category.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Due: {new Date(goal.target_completion_date).toLocaleDateString()}
                      </div>
                      {goal.mentor && (
                        <div className="flex items-center">
                          <span className="text-xs">Mentor: {goal.mentor.first_name}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedGoal(goal)}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedGoal && (
        <GoalDetailModal
          goal={selectedGoal}
          isOpen={!!selectedGoal}
          onClose={() => setSelectedGoal(null)}
        />
      )}
    </div>
  );
}

function GoalForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    goal_type: 'individual',
    priority: 'medium',
    start_date: '',
    target_completion_date: '',
    success_criteria: '',
    measurement_method: '',
    target_metric: '',
    current_metric: '',
    required_resources: '',
    required_skills: [] as string[],
    mentor_id: '',
    budget_allocated: '',
    tags: [] as string[],
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newSkill, setNewSkill] = useState('');
  const [newTag, setNewTag] = useState('');

  // Helper functions for array fields
  const addSkill = () => {
    if (newSkill.trim() && !formData.required_skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        required_skills: [...formData.required_skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      required_skills: formData.required_skills.filter(skill => skill !== skillToRemove)
    });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.target_completion_date) {
      newErrors.target_completion_date = 'Target completion date is required';
    }

    if (formData.start_date && formData.target_completion_date) {
      const startDate = new Date(formData.start_date);
      const targetDate = new Date(formData.target_completion_date);
      if (startDate >= targetDate) {
        newErrors.target_completion_date = 'Target date must be after start date';
      }
    }

    if (formData.budget_allocated && isNaN(Number(formData.budget_allocated))) {
      newErrors.budget_allocated = 'Budget must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      // Prepare data for submission
      const submitData = {
        ...formData,
        budget_allocated: formData.budget_allocated ? Number(formData.budget_allocated) : null,
        start_date: formData.start_date || new Date().toISOString().split('T')[0], // Default to today if not provided
        mentor_id: formData.mentor_id || null
      };

      const response = await fetch('/api/career-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();

      if (response.ok) {
        // Reset form
        setFormData({
          title: '',
          description: '',
          category: '',
          goal_type: 'individual',
          priority: 'medium',
          start_date: '',
          target_completion_date: '',
          success_criteria: '',
          measurement_method: '',
          target_metric: '',
          current_metric: '',
          required_resources: '',
          required_skills: [],
          mentor_id: '',
          budget_allocated: '',
          tags: [],
          notes: ''
        });
        setNewSkill('');
        setNewTag('');
        onSuccess();
      } else {
        setErrors({ submit: result.error || 'Failed to create career goal' });
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto">
      {/* Display submit error */}
      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Goal Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional Development</SelectItem>
                <SelectItem value="technical">Technical Skills</SelectItem>
                <SelectItem value="leadership">Leadership</SelectItem>
                <SelectItem value="certification">Certification</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="personal_development">Personal Development</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && <p className="text-sm text-red-600">{errors.category}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder="Describe your career goal in detail..."
          />
        </div>
      </div>

      {/* Goal Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Goal Configuration</h3>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="goal_type">Goal Type</Label>
            <Select value={formData.goal_type} onValueChange={(value) => setFormData({ ...formData, goal_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="department">Department</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget_allocated">Budget ($)</Label>
            <Input
              id="budget_allocated"
              type="number"
              value={formData.budget_allocated}
              onChange={(e) => setFormData({ ...formData, budget_allocated: e.target.value })}
              placeholder="0.00"
              className={errors.budget_allocated ? 'border-red-500' : ''}
            />
            {errors.budget_allocated && <p className="text-sm text-red-600">{errors.budget_allocated}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">Start Date</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_completion_date">Target Completion Date *</Label>
            <Input
              id="target_completion_date"
              type="date"
              value={formData.target_completion_date}
              onChange={(e) => setFormData({ ...formData, target_completion_date: e.target.value })}
              className={errors.target_completion_date ? 'border-red-500' : ''}
            />
            {errors.target_completion_date && <p className="text-sm text-red-600">{errors.target_completion_date}</p>}
          </div>
        </div>
      </div>

      {/* Success Criteria */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Success Criteria</h3>

        <div className="space-y-2">
          <Label htmlFor="success_criteria">Success Criteria</Label>
          <Textarea
            id="success_criteria"
            value={formData.success_criteria}
            onChange={(e) => setFormData({ ...formData, success_criteria: e.target.value })}
            rows={2}
            placeholder="What does success look like for this goal?"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="measurement_method">Measurement Method</Label>
            <Input
              id="measurement_method"
              value={formData.measurement_method}
              onChange={(e) => setFormData({ ...formData, measurement_method: e.target.value })}
              placeholder="How will you measure progress?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_metric">Target Metric</Label>
            <Input
              id="target_metric"
              value={formData.target_metric}
              onChange={(e) => setFormData({ ...formData, target_metric: e.target.value })}
              placeholder="e.g., 90% completion rate"
            />
          </div>
        </div>
      </div>

      {/* Resources and Skills */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Resources & Skills</h3>

        <div className="space-y-2">
          <Label htmlFor="required_resources">Required Resources</Label>
          <Textarea
            id="required_resources"
            value={formData.required_resources}
            onChange={(e) => setFormData({ ...formData, required_resources: e.target.value })}
            rows={2}
            placeholder="List resources needed (training materials, software, etc.)"
          />
        </div>

        {/* Required Skills */}
        <div className="space-y-2">
          <Label>Required Skills</Label>
          <div className="flex gap-2">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Add a skill..."
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
            />
            <Button type="button" onClick={addSkill} variant="outline" size="sm">
              Add
            </Button>
          </div>
          {formData.required_skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.required_skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeSkill(skill)}>
                  {skill} ×
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tags and Notes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Additional Information</h3>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag..."
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button type="button" onClick={addTag} variant="outline" size="sm">
              Add
            </Button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="cursor-pointer" onClick={() => removeTag(tag)}>
                  {tag} ×
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            placeholder="Any additional notes or comments..."
          />
        </div>
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Creating...' : 'Create Career Goal'}
      </Button>
    </form>
  );
}

function GoalDetailModal({
  goal,
  isOpen,
  onClose
}: {
  goal: CareerGoal;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span className="text-2xl">{getCategoryIcon(goal.category)}</span>
            <span>{goal.title}</span>
          </DialogTitle>
          <DialogDescription>
            {goal.description}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="milestones">Milestones</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Badge className={getStatusColor(goal.status)}>
                  {goal.status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <Label>Priority</Label>
                <Badge className={getPriorityColor(goal.priority)}>
                  {goal.priority}
                </Badge>
              </div>
              <div>
                <Label>Progress</Label>
                <div className="flex items-center space-x-2">
                  <Progress value={goal.progress_percentage} className="flex-1" />
                  <span className="text-sm">{goal.progress_percentage}%</span>
                </div>
              </div>
              <div>
                <Label>Target Date</Label>
                <p className="text-sm">{new Date(goal.target_completion_date).toLocaleDateString()}</p>
              </div>
            </div>

            {goal.success_criteria && (
              <div>
                <Label>Success Criteria</Label>
                <p className="text-sm text-gray-600">{goal.success_criteria}</p>
              </div>
            )}

            {goal.required_resources && (
              <div>
                <Label>Required Resources</Label>
                <p className="text-sm text-gray-600">{goal.required_resources}</p>
              </div>
            )}

            {goal.tags && goal.tags.length > 0 && (
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-1">
                  {goal.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="milestones" className="space-y-4">
            {goal.milestones && goal.milestones.length > 0 ? (
              <div className="space-y-3">
                {goal.milestones.map((milestone) => (
                  <Card key={milestone.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{milestone.title}</h4>
                          {milestone.description && (
                            <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <span>Target: {new Date(milestone.target_date).toLocaleDateString()}</span>
                            <span>Progress: {milestone.progress_percentage}%</span>
                          </div>
                        </div>
                        <Badge className={getStatusColor(milestone.status)}>
                          {milestone.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No milestones defined yet</p>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <p className="text-center text-gray-500 py-8">Progress tracking coming soon...</p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
