import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Upload, Download, Trash2, Share2, PenTool, Check, Eye, X } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  url: string;
  shared: boolean;
  signatureImage: string | null;
  signedAt: string | null;
  createdAt: string;
  ownerId: string;
}

const SERVER_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export const DocumentsPage: React.FC = () => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // Sign canvas states
  const [showSignModal, setShowSignModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSignSubmitting, setIsSignSubmitting] = useState(false);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Download file locally using the backend download endpoint to preserve original filename
  const downloadFile = (url: string, fileName: string) => {
    try {
      // Replace static '/uploads/' path with download endpoint '/api/documents/download/'
      let downloadUrl = url.replace('/uploads/', '/api/documents/download/');
      
      if (fileName) {
        downloadUrl += `?name=${encodeURIComponent(fileName)}`;
      }
      
      // Navigate to download URL; since it returns Content-Disposition: attachment,
      // the browser will download it without navigating away from the page.
      window.location.href = downloadUrl;
    } catch (error) {
      console.error('Download failed, falling back to open in new tab:', error);
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/documents');
      setDocuments(response.data);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Could not load documents.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('document', file);

    setIsUploading(true);
    try {
      await api.post('/documents/upload', formData);
      toast.success('Document uploaded successfully!');
      fetchDocuments();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload document.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleShare = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await api.post(`/documents/share/${id}`);
      toast.success(response.data.shared ? 'Document is now shared with partners!' : 'Document sharing revoked.');
      fetchDocuments();
      if (selectedDoc?.id === id) {
        setSelectedDoc(response.data);
      }
    } catch (error) {
      toast.error('Failed to toggle sharing.');
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document permanently?')) return;

    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document deleted successfully.');
      fetchDocuments();
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
    } catch (error) {
      toast.error('Failed to delete document.');
    }
  };

  // Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedDoc) return;
    
    // Check if canvas is blank
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      toast.error('Please draw your signature before saving.');
      return;
    }

    const signatureImage = canvas.toDataURL('image/png');
    setIsSignSubmitting(true);
    try {
      const response = await api.post(`/documents/sign/${selectedDoc.id}`, { signatureImage });
      toast.success('Document e-signed successfully!');
      setSelectedDoc(response.data);
      setShowSignModal(false);
      fetchDocuments();
    } catch (error) {
      toast.error('Failed to sign document.');
    } finally {
      setIsSignSubmitting(false);
    }
  };

  // Trigger canvas initialization on modal open
  useEffect(() => {
    if (showSignModal && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [showSignModal]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Document Processing Chamber')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('Upload agreements, preview PDFs, and apply hand-drawn e-signatures')}</p>
        </div>
        
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx"
            onChange={handleFileChange}
          />
          <Button 
            leftIcon={<Upload size={18} />} 
            onClick={handleUploadClick}
            isLoading={isUploading}
          >
            {t('Upload Document')}
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Document list */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">{t('All Documents')}</h2>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <p className="text-center py-8 text-gray-500">{t('Loading documents...')}</p>
              ) : documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors duration-200 border border-transparent ${selectedDoc?.id === doc.id ? 'border-primary-300 dark:border-primary-700 bg-primary-50/30 dark:bg-primary-900/30' : ''}`}
                    >
                      <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg mr-4">
                        <FileText size={24} className="text-primary-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {doc.name}
                          </h3>
                          {doc.shared && (
                            <Badge variant="primary" size="sm">{t('Shared')}</Badge>
                          )}
                          {doc.signatureImage && (
                            <Badge variant="success" size="sm">{t('Signed')}</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <span>{doc.type}</span>
                          <span>{doc.size}</span>
                          <span>{t('Uploaded')} {format(new Date(doc.createdAt), 'PP')}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(SERVER_URL + doc.url, doc.name);
                          }}
                          title={t('Download')}
                        >
                          <Download size={18} />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          onClick={(e) => handleShare(doc.id, e)}
                          title="Toggle Share"
                        >
                          <Share2 size={18} className={doc.shared ? 'text-primary-600' : ''} />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2 text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300 hover:bg-error-50 dark:hover:bg-error-900/30"
                          onClick={(e) => handleDelete(doc.id, e)}
                          title={t('Delete')}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText size={40} className="mx-auto text-gray-400 mb-2" />
                  <p>{t('No documents uploaded yet.')}</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Selected Document Details Drawer (Preview and Signature) */}
        <div className="lg:col-span-1">
          {selectedDoc ? (
            <Card className="h-full border-primary-200">
              <CardHeader className="flex justify-between items-center">
                <h3 className="text-md font-semibold text-gray-900 truncate">{selectedDoc.name}</h3>
                <button onClick={() => setSelectedDoc(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-xs space-y-2">
                  <p><span className="text-gray-500">File Type:</span> <strong className="text-gray-700 font-medium">{selectedDoc.type}</strong></p>
                  <p><span className="text-gray-500">Size:</span> <strong className="text-gray-700 font-medium">{selectedDoc.size}</strong></p>
                  <p><span className="text-gray-500">Status:</span> <strong className="text-gray-700 font-medium">{selectedDoc.shared ? 'Shared' : 'Private'}</strong></p>
                  <p><span className="text-gray-500">Signature:</span> <strong className="text-gray-700 font-medium">{selectedDoc.signatureImage ? 'Digitally Signed' : 'Pending Signature'}</strong></p>
                  {selectedDoc.signedAt && (
                    <p><span className="text-gray-500">Signed On:</span> <strong className="text-gray-700 font-medium">{format(new Date(selectedDoc.signedAt), 'PPp')}</strong></p>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  {/* Preview Button */}
                  <a href={SERVER_URL + selectedDoc.url} target="_blank" rel="noreferrer" className="block w-full">
                    <Button variant="outline" fullWidth leftIcon={<Eye size={16} />}>
                      Preview Document
                    </Button>
                  </a>

                  {/* Sign Button */}
                  {!selectedDoc.signatureImage ? (
                    <Button 
                      fullWidth 
                      leftIcon={<PenTool size={16} />}
                      onClick={() => setShowSignModal(true)}
                    >
                      Sign Document
                    </Button>
                  ) : (
                    <div className="border border-success-200 bg-success-50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-success-700 font-semibold text-sm mb-2">
                        <Check size={16} /> Signed
                      </div>
                      <img 
                        src={selectedDoc.signatureImage} 
                        alt="Signature stamp" 
                        className="max-h-16 mx-auto bg-white border border-gray-200 p-1 rounded" 
                      />
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card className="h-full border-dashed border-2 border-gray-300">
              <CardBody className="flex flex-col items-center justify-center py-16 text-center text-gray-500 h-full">
                <FileText size={32} className="text-gray-400 mb-2" />
                <p className="text-sm">Select a document from the list to preview or sign it.</p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* DRAWING SIGNATURE MODAL */}
      {showSignModal && (
        <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-2xl border-none">
            <CardHeader className="flex justify-between items-center border-b border-gray-100 p-4">
              <h3 className="font-semibold text-lg text-gray-900">Draw Your E-Signature</h3>
              <button onClick={() => setShowSignModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </CardHeader>
            <CardBody className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Draw your signature on the white board below using your mouse or touchpad.
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={180}
                  className="cursor-crosshair w-full h-[180px]"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button variant="outline" size="sm" onClick={clearCanvas}>
                  Clear Pad
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowSignModal(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={saveSignature} isLoading={isSignSubmitting}>
                    Apply Signature
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};