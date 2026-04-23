import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Building,
  Clock,
  Edit,
  Info,
  Loader2,
  Monitor,
  PackagePlus,
  Plus,
  Save,
  Settings,
  Syringe,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import type { ClinicSettings, VaccineInventory, Veterinarian } from '@/types';

type SettingsTab = 'general' | 'hours' | 'system' | 'staff' | 'vaccines';

const SETTINGS_TABS: SettingsTab[] = ['general', 'hours', 'staff', 'vaccines', 'system'];
const EMPTY_INFO_FORM = {
  id: '',
  name: '',
  batchNumber: '',
  origin: '',
  expirationDate: '',
  description: '',
};

export default function SettingsPage() {
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const [vets, setVets] = useState<Veterinarian[]>([]);
  const [newVet, setNewVet] = useState({ name: '', email: '', phone: '', specialty: '', background: '' });

  const [newVaccine, setNewVaccine] = useState('');
  const [inventory, setInventory] = useState<VaccineInventory[]>([]);
  const [isInventoryLoading, setIsInventoryLoading] = useState(true);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [stockFormData, setStockFormData] = useState({ name: '', quantity: '' });
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
  const [infoFormData, setInfoFormData] = useState(EMPTY_INFO_FORM);

  useEffect(() => {
    const requestedTab = new URLSearchParams(location.search).get('tab');

    if (requestedTab && SETTINGS_TABS.includes(requestedTab as SettingsTab)) {
      setActiveTab(requestedTab as SettingsTab);
    }
  }, [location.search]);

  useEffect(() => {
    void loadSettings();

    if (user?.role === 'admin' || user?.role === 'vet_clinic') {
      void loadVets();
      void loadInventory();
      return;
    }

    setIsInventoryLoading(false);
  }, [user]);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVets = async () => {
    try {
      const data = await api.getVeterinarians();
      setVets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load veterinarians:', error);
    }
  };

  const loadInventory = async () => {
    setIsInventoryLoading(true);

    try {
      const data = await api.getInventory();
      setInventory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load vaccine inventory:', error);
    } finally {
      setIsInventoryLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);

    try {
      await api.updateSettings(settings);
      toast({
        title: 'Settings Saved',
        description: 'Clinic settings have been updated in MySQL.',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleHoursChange = (index: number, field: 'open' | 'close' | 'isOpen', value: string | boolean) => {
    if (!settings) return;

    const newHours = [...settings.openingHours];
    newHours[index] = { ...newHours[index], [field]: value };
    setSettings({ ...settings, openingHours: newHours });
  };

  const handleAddVet = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newVet.name || !newVet.email) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields (Name, Email).',
        variant: 'destructive',
      });
      return;
    }

    try {
      await api.createVeterinarian(newVet);
      toast({ title: 'Success', description: 'Veterinarian doctor added successfully.' });
      setNewVet({ name: '', email: '', phone: '', specialty: '', background: '' });
      await loadVets();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add veterinarian.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleDeleteVet = async (id: string | number) => {
    if (!confirm('Are you sure you want to remove this veterinarian?')) return;

    try {
      await api.deleteVeterinarian(id);
      toast({ title: 'Success', description: 'Veterinarian doctor removed.' });
      await loadVets();
    } catch (error) {
      toast({ title: 'Delete Failed', variant: 'destructive' });
    }
  };

  const handleAddVaccine = async () => {
    if (!settings || !newVaccine.trim()) return;

    const trimmedName = newVaccine.trim();
    const currentTypes = settings.vaccineTypes || [];
    const alreadyExists = currentTypes.some((type) => type.toLowerCase() === trimmedName.toLowerCase());

    if (alreadyExists) {
      toast({
        title: 'Error',
        description: 'Vaccine type already exists.',
        variant: 'destructive',
      });
      return;
    }

    const updatedTypes = [...currentTypes, trimmedName];

    try {
      await api.updateSettings({ vaccineTypes: updatedTypes });
      setSettings({ ...settings, vaccineTypes: updatedTypes });
      setNewVaccine('');
      toast({ title: 'Success', description: 'Vaccine type added to database.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update vaccine list.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteVaccine = async (vaccine: string) => {
    if (!settings) return;

    const updatedTypes = (settings.vaccineTypes || []).filter((type) => type !== vaccine);

    try {
      await api.updateSettings({ vaccineTypes: updatedTypes });
      setSettings({ ...settings, vaccineTypes: updatedTypes });
      toast({ title: 'Success', description: 'Vaccine type removed.' });
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleUpdateStock = (vaccineName: string) => {
    if (user?.role !== 'vet_clinic') return;

    setStockFormData({ name: vaccineName, quantity: '' });
    setIsStockDialogOpen(true);
  };

  const submitStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (user?.role !== 'vet_clinic') return;

    const quantity = Number.parseInt(stockFormData.quantity, 10);

    if (Number.isNaN(quantity) || quantity <= 0) {
      toast({
        title: 'Invalid Quantity',
        description: 'Enter a stock amount greater than zero.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await api.upsertInventory(stockFormData.name, quantity);
      toast({
        title: 'Inventory Replenished',
        description: `Successfully added ${quantity} units of ${stockFormData.name}.`,
      });
      await loadInventory();
      setIsStockDialogOpen(false);
      setStockFormData({ name: '', quantity: '' });
    } catch (error) {
      toast({ title: 'Stock Update Failed', variant: 'destructive' });
    }
  };

  const handleUpdateInfo = (vaccineName: string) => {
    if (user?.role !== 'vet_clinic') return;

    const existingItem = inventory.find(
      (item) => item.name.toLowerCase() === vaccineName.toLowerCase()
    );

    setInfoFormData({
      id: existingItem?.id?.toString() || '',
      name: existingItem?.name || vaccineName,
      batchNumber: existingItem?.batchNumber || '',
      origin: existingItem?.origin || '',
      expirationDate: existingItem?.expirationDate || '',
      description: existingItem?.description || '',
    });
    setIsInfoDialogOpen(true);
  };

  const submitInfoUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (user?.role !== 'vet_clinic') return;

    const payload = {
      batch_number: infoFormData.batchNumber || undefined,
      origin: infoFormData.origin || undefined,
      expiration_date: infoFormData.expirationDate || undefined,
      description: infoFormData.description || undefined,
    };

    try {
      if (infoFormData.id) {
        await api.updateInventory(infoFormData.id, payload);
      } else {
        await api.createInventory({
          name: infoFormData.name,
          stock: 0,
          ...payload,
        });
      }

      toast({
        title: 'Information Saved',
        description: `Metadata updated for ${infoFormData.name}.`,
      });
      await loadInventory();
      setIsInfoDialogOpen(false);
      setInfoFormData(EMPTY_INFO_FORM);
    } catch (error) {
      toast({ title: 'Update Failed', variant: 'destructive' });
    }
  };

  const canManageInventory = user?.role === 'vet_clinic';
  const inventoryVaccineNames = [...(settings?.vaccineTypes || []), ...inventory.map((item) => item.name)]
    .filter(
      (name, index, allNames) =>
        allNames.findIndex((candidate) => candidate.toLowerCase() === name.toLowerCase()) === index
    );

  if (user?.role !== 'admin' && user?.role !== 'vet_clinic') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">
            Only administrators and vet clinic accounts can access settings.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !settings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="mt-4 text-muted-foreground">Loading Clinic Configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10" data-tour="settings-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage clinic settings and configuration</p>
        </div>

        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-8 lg:space-y-0">
        <aside className="-mx-4 lg:mx-0 lg:w-1/4">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1 px-4 lg:px-0 overflow-x-auto scrollbar-none pb-2 min-w-max lg:min-w-0">
            <Button
              variant={activeTab === 'general' ? 'secondary' : 'ghost'}
              className="justify-start gap-2"
              onClick={() => setActiveTab('general')}
            >
              <Building className="h-4 w-4" />
              General Information
            </Button>
            <Button
              variant={activeTab === 'hours' ? 'secondary' : 'ghost'}
              className="justify-start gap-2"
              onClick={() => setActiveTab('hours')}
            >
              <Clock className="h-4 w-4" />
              Operating Hours
            </Button>
            <Button
              variant={activeTab === 'staff' ? 'secondary' : 'ghost'}
              className="justify-start gap-2"
              onClick={() => setActiveTab('staff')}
            >
              <UserPlus className="h-4 w-4" />
              Veterinarians
            </Button>
            <Button
              variant={activeTab === 'vaccines' ? 'secondary' : 'ghost'}
              className="justify-start gap-2"
              onClick={() => setActiveTab('vaccines')}
            >
              <Syringe className="h-4 w-4" />
              Vaccine Database
            </Button>
            <Button
              variant={activeTab === 'system' ? 'secondary' : 'ghost'}
              className="justify-start gap-2"
              onClick={() => setActiveTab('system')}
            >
              <Monitor className="h-4 w-4" />
              System Information
            </Button>
          </nav>
        </aside>

        <div className={cn('flex-1', activeTab !== 'vaccines' && 'lg:max-w-2xl')}>
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <CardTitle>Clinic Information</CardTitle>
                <CardDescription>Basic information about your clinic</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Clinic Name</Label>
                  <Input
                    value={settings.name}
                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'hours' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Operating Hours
                </CardTitle>
                <CardDescription>Set your clinic's working hours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {settings.openingHours.map((hours, index) => (
                    <div key={hours.day} className="flex items-center gap-4">
                      <div className="w-24">
                        <span className="text-sm font-medium">{hours.day}</span>
                      </div>
                      <Switch
                        checked={hours.isOpen}
                        onCheckedChange={(checked) => handleHoursChange(index, 'isOpen', checked)}
                      />
                      {hours.isOpen ? (
                        <>
                          <Input
                            type="time"
                            value={hours.open}
                            onChange={(e) => handleHoursChange(index, 'open', e.target.value)}
                            className="w-28"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={hours.close}
                            onChange={(e) => handleHoursChange(index, 'close', e.target.value)}
                            className="w-28"
                          />
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'staff' && (
            <Card>
              <CardHeader>
                <CardTitle>Manage Veterinarians</CardTitle>
                <CardDescription>
                  Add or remove veterinarian doctors from the clinic
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form
                  onSubmit={handleAddVet}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md bg-muted/20"
                >
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      required
                      value={newVet.name}
                      onChange={(e) => setNewVet({ ...newVet, name: e.target.value })}
                      placeholder="Dr. John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      required
                      type="email"
                      value={newVet.email}
                      onChange={(e) => setNewVet({ ...newVet, email: e.target.value })}
                      placeholder="doctor@clinic.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Specialty</Label>
                    <Input
                      value={newVet.specialty}
                      onChange={(e) => setNewVet({ ...newVet, specialty: e.target.value })}
                      placeholder="e.g. Surgery, General Practice"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={newVet.phone}
                      onChange={(e) => setNewVet({ ...newVet, phone: e.target.value })}
                      placeholder="+63 900 000 0000"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Professional Background</Label>
                    <Input
                      value={newVet.background}
                      onChange={(e) => setNewVet({ ...newVet, background: e.target.value })}
                      placeholder="Brief description of the doctor's experience and background"
                    />
                  </div>
                  <div className="md:col-span-2 pt-2">
                    <Button type="submit">
                      <UserPlus className="mr-2 h-4 w-4" /> Add Veterinarian Doctor
                    </Button>
                  </div>
                </form>

                <div className="space-y-4 pt-4">
                  <h3 className="font-semibold text-lg">Current Veterinarians ({vets.length})</h3>
                  {vets.map((vet) => (
                    <div key={vet.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div>
                        <p className="font-medium">
                          {vet.name}{' '}
                          <span className="font-normal text-sm text-primary/80">
                            ({vet.specialty || 'General Practice'})
                          </span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {vet.email} | {vet.phone || 'No phone'}
                        </p>
                        {vet.background && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {vet.background}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 shrink-0"
                        onClick={() => handleDeleteVet(vet.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {vets.length === 0 && (
                    <p className="text-sm text-muted-foreground">No veterinarians found.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'vaccines' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vaccine Types</CardTitle>
                  <CardDescription>
                    Define the standard vaccine names available in your clinic database.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex-1">
                      <Input
                        placeholder="Enter new vaccine name (e.g., Canine Parvovirus)"
                        value={newVaccine}
                        onChange={(e) => setNewVaccine(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleAddVaccine();
                          }
                        }}
                      />
                    </div>
                    <Button onClick={handleAddVaccine}>
                      <Plus className="mr-2 h-4 w-4" /> Add Type
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(settings.vaccineTypes || []).map((vaccine) => (
                      <div
                        key={vaccine}
                        className="flex items-center justify-between p-3 border rounded-md bg-muted/10"
                      >
                        <span className="font-medium">{vaccine}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 h-8 w-8"
                          onClick={() => handleDeleteVaccine(vaccine)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!settings.vaccineTypes || settings.vaccineTypes.length === 0) && (
                      <p className="text-sm text-muted-foreground col-span-2">
                        No vaccine types defined.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PackagePlus className="h-5 w-5" />
                    Vaccine Inventory
                  </CardTitle>
                  <CardDescription>
                    Inventory management has been moved here from the Vaccinations page.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!canManageInventory && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Inventory is view-only for administrator accounts. Sign in as a vet clinic
                      account to update stock, batch details, and expiration dates.
                    </div>
                  )}

                  {isInventoryLoading ? (
                    <div className="flex min-h-[220px] items-center justify-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-60" />
                        <p>Loading vaccine inventory...</p>
                      </div>
                    </div>
                  ) : inventoryVaccineNames.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                      Add vaccine types above to start building the vaccine database.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[180px]">Vaccine</TableHead>
                            <TableHead>Batch / Lot</TableHead>
                            <TableHead>Manufacturer</TableHead>
                            <TableHead>Expiration</TableHead>
                            <TableHead>In Stock</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventoryVaccineNames.map((vaccineName) => {
                            const item = inventory.find(
                              (inventoryItem) =>
                                inventoryItem.name.toLowerCase() === vaccineName.toLowerCase()
                            );
                            const stock = item?.stock ?? 0;

                            return (
                              <TableRow key={vaccineName}>
                                <TableCell className="font-medium">
                                  {vaccineName}
                                  {item?.description && (
                                    <p
                                      className="text-xs text-muted-foreground mt-1 truncate max-w-[220px]"
                                      title={item.description}
                                    >
                                      {item.description}
                                    </p>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {item?.batchNumber || '-'}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {item?.origin || '-'}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {item?.expirationDate && isValid(parseISO(item.expirationDate))
                                    ? format(parseISO(item.expirationDate), 'MMM d, yyyy')
                                    : '-'}
                                </TableCell>
                                <TableCell className="font-mono text-base">{stock}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      stock === 0
                                        ? 'destructive'
                                        : stock <= 10
                                          ? 'secondary'
                                          : 'default'
                                    }
                                    className="px-3"
                                  >
                                    {stock === 0
                                      ? 'Out of Stock'
                                      : stock <= 10
                                        ? 'Low Supplies'
                                        : 'In Stock'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!canManageInventory}
                                      onClick={() => handleUpdateInfo(vaccineName)}
                                    >
                                      <Edit className="h-4 w-4 lg:mr-2" />
                                      <span className="hidden lg:inline">Details</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!canManageInventory}
                                      onClick={() => handleUpdateStock(vaccineName)}
                                    >
                                      <PackagePlus className="h-4 w-4 lg:mr-2" />
                                      <span className="hidden lg:inline">Restock</span>
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Dialog
                open={isStockDialogOpen}
                onOpenChange={(open) => {
                  setIsStockDialogOpen(open);
                  if (!open) {
                    setStockFormData({ name: '', quantity: '' });
                  }
                }}
              >
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Restock Vaccine</DialogTitle>
                    <DialogDescription>Adding units to {stockFormData.name}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={submitStockUpdate}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Amount to Add</Label>
                        <Input
                          type="number"
                          min="1"
                          value={stockFormData.quantity}
                          onChange={(e) =>
                            setStockFormData({ ...stockFormData, quantity: e.target.value })
                          }
                          placeholder="e.g. 50"
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsStockDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save Stock</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog
                open={isInfoDialogOpen}
                onOpenChange={(open) => {
                  setIsInfoDialogOpen(open);
                  if (!open) {
                    setInfoFormData(EMPTY_INFO_FORM);
                  }
                }}
              >
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Update Vaccine Details</DialogTitle>
                    <DialogDescription>Editing details for {infoFormData.name}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={submitInfoUpdate}>
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                      <div className="space-y-2">
                        <Label>Batch / Lot Number</Label>
                        <Input
                          value={infoFormData.batchNumber}
                          onChange={(e) =>
                            setInfoFormData({ ...infoFormData, batchNumber: e.target.value })
                          }
                          placeholder="e.g. BATCH-2026-X"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Manufacturer / Origin</Label>
                        <Input
                          value={infoFormData.origin}
                          onChange={(e) =>
                            setInfoFormData({ ...infoFormData, origin: e.target.value })
                          }
                          placeholder="e.g. Zoetis, Boehringer Ingelheim"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expiration Date</Label>
                        <Input
                          type="date"
                          value={
                            infoFormData.expirationDate && isValid(parseISO(infoFormData.expirationDate))
                              ? format(parseISO(infoFormData.expirationDate), 'yyyy-MM-dd')
                              : infoFormData.expirationDate
                          }
                          onChange={(e) =>
                            setInfoFormData({ ...infoFormData, expirationDate: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Item Description / Medical Notes</Label>
                        <Textarea
                          value={infoFormData.description}
                          onChange={(e) =>
                            setInfoFormData({ ...infoFormData, description: e.target.value })
                          }
                          placeholder="Contraindications, handling instructions..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsInfoDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {infoFormData.id ? 'Save Updates' : 'Create Record'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeTab === 'system' && (
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>About this system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">System Name</p>
                    <p className="font-medium">PetPals PH</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Version</p>
                    <p className="font-medium">1.0.0</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Technology Stack</p>
                    <p className="font-medium">Laravel 10 + React (Vite) + MySQL</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Storage</p>
                    <p className="font-medium text-green-600 font-bold">
                      MySQL Persistent Database (Laragon)
                    </p>
                  </div>
                </div>
                <div className="mt-6 p-4 rounded-lg bg-green-50 border border-green-100 flex items-start gap-3">
                  <Info className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-green-700 leading-relaxed">
                    <strong className="text-green-800">Migration Complete:</strong> This system is
                    now fully integrated with your MySQL database. All records for pets,
                    appointments, medical history, vaccinations, and clinical inventory are
                    persisted in the backend. Data is safe even if you clear your browser cache.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
