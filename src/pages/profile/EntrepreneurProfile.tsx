import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, Users, Calendar, Building2, MapPin, UserCircle, FileText, DollarSign, Send } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useLocale } from '../../context/LocaleContext';
import { useTranslation } from 'react-i18next';

export const EntrepreneurProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, updateProfile } = useAuth();
  const { formatStringCurrency } = useLocale();
  const { t } = useTranslation();
  const [entrepreneur, setEntrepreneur] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRequestedCollaboration, setHasRequestedCollaboration] = useState(false);
  
  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editStartupName, setEditStartupName] = useState('');
  const [editPitchSummary, setEditPitchSummary] = useState('');
  const [editFundingNeeded, setEditFundingNeeded] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editFoundedYear, setEditFoundedYear] = useState(2024);
  const [editTeamSize, setEditTeamSize] = useState(1);

  // Cropper States
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const cropCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const cropImgRef = React.useRef<HTMLImageElement | null>(null);
  const isDraggingRef = React.useRef(false);
  const lastPosRef = React.useRef({ x: 0, y: 0 });
  const CROP_SIZE = 280; // Canvas size for the crop circle

  // Draw crop preview on canvas
  const drawCropPreview = React.useCallback((z: number, ox: number, oy: number) => {
    const canvas = cropCanvasRef.current;
    const img = cropImgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = CROP_SIZE;
    ctx.clearRect(0, 0, size, size);

    // Draw dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, size, size);

    // Calculate draw dimensions (cover the circle)
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const aspect = imgW / imgH;
    let drawW: number, drawH: number;
    if (aspect > 1) {
      drawH = size;
      drawW = size * aspect;
    } else {
      drawW = size;
      drawH = size / aspect;
    }
    drawW *= z;
    drawH *= z;

    const dx = (size - drawW) / 2 + ox;
    const dy = (size - drawH) / 2 + oy;

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, dx, dy, drawW, drawH);
    ctx.restore();

    // Draw circle border
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw grid lines for alignment
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(size / 3, 0); ctx.lineTo(size / 3, size);
    ctx.moveTo((size * 2) / 3, 0); ctx.lineTo((size * 2) / 3, size);
    ctx.moveTo(0, size / 3); ctx.lineTo(size, size / 3);
    ctx.moveTo(0, (size * 2) / 3); ctx.lineTo(size, (size * 2) / 3);
    ctx.stroke();
  }, []);

  // Redraw when zoom or offset changes
  useEffect(() => {
    if (showCropModal && cropImgRef.current) {
      drawCropPreview(cropZoom, cropOffset.x, cropOffset.y);
    }
  }, [cropZoom, cropOffset, showCropModal, drawCropPreview]);

  const handleCropMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setCropOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handleCropMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleCropTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleCropTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastPosRef.current.x;
    const dy = e.touches[0].clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setCropOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handleCropWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setCropZoom(prev => Math.max(0.2, Math.min(5, prev - e.deltaY * 0.002)));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSelectedImage(dataUrl);
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });

      // Pre-load the image to get dimensions
      const img = new Image();
      img.onload = () => {
        cropImgRef.current = img;
        setShowCropModal(true);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleConfirmCrop = () => {
    const img = cropImgRef.current;
    if (!img) return;

    // Render the final cropped image at 300x300 px
    const outputSize = 300;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const aspect = imgW / imgH;
    let drawW: number, drawH: number;
    if (aspect > 1) {
      drawH = CROP_SIZE;
      drawW = CROP_SIZE * aspect;
    } else {
      drawW = CROP_SIZE;
      drawH = CROP_SIZE / aspect;
    }
    drawW *= cropZoom;
    drawH *= cropZoom;

    const scale = outputSize / CROP_SIZE;
    const dx = ((CROP_SIZE - drawW) / 2 + cropOffset.x) * scale;
    const dy = ((CROP_SIZE - drawH) / 2 + cropOffset.y) * scale;

    // Clip to circle
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, dx, dy, drawW * scale, drawH * scale);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      
      setIsUploading(true);
      const fileToUpload = new File([blob], 'avatar.png', { type: 'image/png' });
      const formData = new FormData();
      formData.append('avatar', fileToUpload);

      try {
        const res = await api.post('/users/avatar', formData);
        
        setEditAvatarUrl(res.data.avatarUrl);
        setShowCropModal(false);
        setSelectedImage(null);
        toast.success('Avatar cropped and uploaded!');
      } catch (err) {
        console.error(err);
        toast.error('Failed to upload cropped image');
      } finally {
        setIsUploading(false);
      }
    }, 'image/png');
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      const targetId = id || currentUser?.id;
      if (!targetId) return;
      try {
        const profileRes = await api.get(`/users/profile/${targetId}`);
        setEntrepreneur(profileRes.data);

        if (currentUser?.role === 'investor') {
          const reqRes = await api.get('/users/connect/requests');
          const exists = reqRes.data.some((req: any) => req.entrepreneurId === targetId);
          setHasRequestedCollaboration(exists);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfileData();
  }, [id, currentUser]);
  
  const handleSendRequest = async () => {
    const targetId = id || currentUser?.id;
    if (currentUser?.role === 'investor' && targetId && entrepreneur) {
      try {
        await api.post('/users/connect', {
          recipientId: targetId,
          message: `I'm interested in learning more about ${entrepreneur.startupName || 'your startup'} and would like to explore potential investment opportunities.`
        });
        setHasRequestedCollaboration(true);
        toast.success('Collaboration request sent successfully!');
      } catch (error) {
        toast.error('Failed to send collaboration request.');
      }
    }
  };

  const openEditModal = () => {
    if (entrepreneur) {
      setEditName(entrepreneur.name || '');
      setEditAvatarUrl(entrepreneur.avatarUrl || '');
      setEditBio(entrepreneur.bio || '');
      setEditStartupName(entrepreneur.startupName || '');
      setEditPitchSummary(entrepreneur.pitchSummary || '');
      setEditFundingNeeded(entrepreneur.fundingNeeded || '');
      setEditIndustry(entrepreneur.industry || '');
      setEditLocation(entrepreneur.location || '');
      setEditFoundedYear(entrepreneur.foundedYear || 2024);
      setEditTeamSize(entrepreneur.teamSize || 1);
      setIsEditing(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updates = {
        name: editName,
        avatarUrl: editAvatarUrl,
        bio: editBio,
        startupName: editStartupName,
        pitchSummary: editPitchSummary,
        fundingNeeded: editFundingNeeded,
        industry: editIndustry,
        location: editLocation,
        foundedYear: editFoundedYear,
        teamSize: editTeamSize
      };

      await updateProfile(entrepreneur.id, updates);
      
      setEntrepreneur((prev: any) => ({
        ...prev,
        ...updates
      }));
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <p className="text-gray-500 text-lg">{t('Loading startup profile...')}</p>
      </div>
    );
  }
  
  if (!entrepreneur || entrepreneur.role !== 'entrepreneur') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Entrepreneur not found')}</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{t("The entrepreneur profile you're looking for doesn't exist or has been removed.")}</p>
        <Link to="/dashboard/investor">
          <Button variant="outline" className="mt-4">{t('Back to Dashboard')}</Button>
        </Link>
      </div>
    );
  }
  
  const isCurrentUser = currentUser?.id === entrepreneur.id;
  const isInvestor = currentUser?.role === 'investor';
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile header */}
      <Card>
        <CardBody className="sm:flex sm:items-start sm:justify-between p-6">
          <div className="sm:flex sm:space-x-6">
            <Avatar
              src={entrepreneur.avatarUrl}
              alt={entrepreneur.name}
              size="xl"
              status={entrepreneur.isOnline ? 'online' : 'offline'}
              className="mx-auto sm:mx-0"
            />
            
            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{entrepreneur.name}</h1>
              <p className="text-gray-600 dark:text-gray-400 flex items-center justify-center sm:justify-start mt-1">
                <Building2 size={16} className="mr-1 text-gray-500 dark:text-gray-400" />
                {t('Founder at')} {entrepreneur.startupName || t('Startup')}
              </p>
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                <Badge variant="primary">{entrepreneur.industry || t('Industry')}</Badge>
                <Badge variant="gray">
                  <MapPin size={14} className="mr-1" />
                  {entrepreneur.location || t('Location')}
                </Badge>
                <Badge variant="accent">
                  <Calendar size={14} className="mr-1" />
                  {t('Founded')} {entrepreneur.foundedYear}
                </Badge>
                <Badge variant="secondary">
                  <Users size={14} className="mr-1" />
                  {entrepreneur.teamSize} {t('team members')}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
            {!isCurrentUser && (
              <>
                <Link to={`/chat/${entrepreneur.id}`}>
                  <Button
                    variant="outline"
                    leftIcon={<MessageCircle size={18} />}
                  >
                    {t('Message')}
                  </Button>
                </Link>
                
                {isInvestor && (
                  <Button
                    leftIcon={<Send size={18} />}
                    disabled={hasRequestedCollaboration}
                    onClick={handleSendRequest}
                  >
                    {hasRequestedCollaboration ? t('Request Sent') : t('Request Collaboration')}
                  </Button>
                )}
              </>
            )}
            
            {isCurrentUser && (
              <Button
                variant="outline"
                leftIcon={<UserCircle size={18} />}
                onClick={openEditModal}
              >
                {t('Edit Profile')}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('About')}</h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-750 leading-relaxed whitespace-pre-wrap">{entrepreneur.bio || t('No bio written yet.')}</p>
            </CardBody>
          </Card>
          
          {/* Startup Description */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Startup Overview')}</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium text-gray-900 dark:text-white">{t('Pitch & Solution')}</h3>
                  <p className="text-gray-750 leading-relaxed mt-1 whitespace-pre-wrap">
                    {entrepreneur.pitchSummary || t('No pitch summary available.')}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900 dark:text-white">{t('Market Opportunity')}</h3>
                  <p className="text-gray-750 mt-1 leading-relaxed">
                    {t('marketOpportunityText', { industry: entrepreneur.industry || t('Industry') })}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          {/* Team */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Team')}</h2>
              <span className="text-sm text-gray-500">{entrepreneur.teamSize} {t('members')}</span>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center p-3 border border-gray-250 rounded-lg bg-gray-50/20">
                  <Avatar
                    src={entrepreneur.avatarUrl}
                    alt={entrepreneur.name}
                    size="md"
                    className="mr-3"
                  />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">{entrepreneur.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('Founder & CEO')}</p>
                  </div>
                </div>
                
                <div className="flex items-center p-3 border border-gray-250 rounded-lg bg-gray-50/20">
                  <Avatar
                    src="https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg"
                    alt="Team Member"
                    size="md"
                    className="mr-3"
                  />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Alex Johnson</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">CTO</p>
                  </div>
                </div>
                
                {entrepreneur.teamSize > 2 && (
                  <div className="flex items-center justify-center p-3 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/10">
                    <p className="text-sm text-gray-500 dark:text-gray-400">+ {entrepreneur.teamSize - 2} {t('more team members')}</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
        
        {/* Sidebar - right side */}
        <div className="space-y-6">
          {/* Funding Details */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Funding')}</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('Current Round Goal')}</span>
                  <div className="flex items-center mt-1">
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {entrepreneur.fundingNeeded ? formatStringCurrency(entrepreneur.fundingNeeded) : t('Undisclosed')}
                    </p>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('Valuation Range')}</span>
                  <p className="text-md font-medium text-gray-900 dark:text-gray-100">
                    {formatStringCurrency('$8M')} - {formatStringCurrency('$12M')}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('Previous Funding')}</span>
                  <p className="text-md font-medium text-gray-900 dark:text-gray-100">
                    {formatStringCurrency('$750K')} {t('Seed')} (2022)
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
          
          {/* Documents */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('Documents')}</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-md mr-3">
                    <FileText size={18} className="text-primary-700 dark:text-primary-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Pitch Deck</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Updated 2 months ago</p>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Edit Profile Modal Dialog */}
      {isEditing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-155 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
            <form onSubmit={handleSave}>
              <div className="px-6 py-4 border-b border-gray-150 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Profile Details</h3>
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="text-gray-450 hover:text-gray-700 dark:hover:text-gray-300 text-2xl font-semibold transition-colors"
                >
                  &times;
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                {/* File Upload Selector */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-150 dark:border-gray-700">
                  <Avatar
                    src={editAvatarUrl}
                    alt="Preview"
                    size="xl"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Profile Picture / Icon
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 dark:file:bg-primary-900/30 file:text-primary-700 dark:file:text-primary-300 hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50 cursor-pointer"
                    />
                    {isUploading && (
                      <p className="text-xs text-primary-600 mt-1 animate-pulse">Uploading image...</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="Full Name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    fullWidth
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Startup Name"
                    value={editStartupName}
                    onChange={(e) => setEditStartupName(e.target.value)}
                    fullWidth
                  />
                  <Input
                    label="Industry"
                    value={editIndustry}
                    onChange={(e) => setEditIndustry(e.target.value)}
                    fullWidth
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Location"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    fullWidth
                  />
                  <Input
                    label="Founded Year"
                    type="number"
                    value={editFoundedYear}
                    onChange={(e) => setEditFoundedYear(parseInt(e.target.value) || 2024)}
                    fullWidth
                  />
                  <Input
                    label="Team Size"
                    type="number"
                    value={editTeamSize}
                    onChange={(e) => setEditTeamSize(parseInt(e.target.value) || 1)}
                    fullWidth
                  />
                </div>
                
                <Input
                  label="Funding Needed"
                  value={editFundingNeeded}
                  onChange={(e) => setEditFundingNeeded(e.target.value)}
                  placeholder="e.g. $500,000"
                  fullWidth
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    rows={3}
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white border px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500/20 focus:ring-4 transition-all duration-200 sm:text-sm focus:outline-none hover:border-gray-400 dark:hover:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pitch Summary / Solution Details
                  </label>
                  <textarea
                    value={editPitchSummary}
                    onChange={(e) => setEditPitchSummary(e.target.value)}
                    rows={4}
                    className="block w-full rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white border px-3 py-2 shadow-sm focus:border-primary-500 focus:ring-primary-500/20 focus:ring-4 transition-all duration-200 sm:text-sm focus:outline-none hover:border-gray-400 dark:hover:border-gray-600"
                  />
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-150 dark:border-gray-800 flex justify-end space-x-2 bg-gray-50/50 dark:bg-gray-800/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp-Style Crop Modal */}
      {showCropModal && selectedImage && (
        <div className="fixed inset-0 z-[60] bg-gray-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">
          {/* Header */}
          <div className="w-full max-w-sm mb-6 text-center">
            <h3 className="text-xl font-bold text-white">Crop Profile Picture</h3>
            <p className="text-sm text-gray-400 mt-1">Drag to reposition • Scroll or slider to zoom</p>
          </div>

          {/* Canvas Crop Area */}
          <div 
            className="relative select-none cursor-grab active:cursor-grabbing"
            style={{ width: CROP_SIZE, height: CROP_SIZE }}
            onMouseDown={handleCropMouseDown}
            onMouseMove={handleCropMouseMove}
            onMouseUp={handleCropMouseUp}
            onMouseLeave={handleCropMouseUp}
            onTouchStart={handleCropTouchStart}
            onTouchMove={handleCropTouchMove}
            onTouchEnd={handleCropMouseUp}
            onWheel={handleCropWheel}
          >
            <canvas
              ref={cropCanvasRef}
              width={CROP_SIZE}
              height={CROP_SIZE}
              className="rounded-full shadow-2xl"
              style={{ width: CROP_SIZE, height: CROP_SIZE }}
            />
          </div>

          {/* Zoom Slider */}
          <div className="w-full max-w-xs mt-8 px-4">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
              <input
                type="range"
                min="0.2"
                max="5"
                step="0.05"
                value={cropZoom}
                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">{cropZoom.toFixed(1)}x zoom</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => {
                setShowCropModal(false);
                setSelectedImage(null);
              }}
              disabled={isUploading}
              className="px-6 py-2.5 rounded-full border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-200 text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmCrop}
              disabled={isUploading}
              className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white transition-all duration-200 text-sm font-medium shadow-lg shadow-indigo-500/30 disabled:opacity-50 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Crop & Save
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};