import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { petsStorage, usersStorage } from '@/lib/storage';
import type { Pet } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Heart,
  Filter,
  Eye
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Dog', emoji: '🐕' },
  { value: 'cat', label: 'Cat', emoji: '🐈' },
  { value: 'bird', label: 'Bird', emoji: '🐦' },
  { value: 'rabbit', label: 'Rabbit', emoji: '🐰' },
  { value: 'hamster', label: 'Hamster', emoji: '🐹' },
  { value: 'fish', label: 'Fish', emoji: '🐠' },
  { value: 'reptile', label: 'Reptile', emoji: '🦎' },
  { value: 'other', label: 'Other', emoji: '🐾' },
];

export default function PetsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ownerParam = searchParams.get('owner');
  
  const [pets, setPets] = useState<Pet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    species: 'dog' as Pet['species'],
    breed: '',
    age: '',
    sex: 'male' as Pet['sex'],
    weight: '',
    color: '',
    microchipId: '',
    allergies: '',
    medicalNotes: '',
    ownerId: '',
  });

  useEffect(() => {
    loadPets();
  }, [user, ownerParam]);

  const loadPets = async () => {
    if (!user) return;

    try {
      // api.getPets() applies server-side role-based filtering:
      // - owner: only their pets
      // - vet_clinic/admin: all pets (optionally filtered by owner_id)
      const params: Record<string, string | number | undefined> = { per_page: 200 };
      if (ownerParam) params.owner_id = ownerParam;

      const response = await api.getPets(params);
      const list: Pet[] = Array.isArray(response)
        ? response
        : (response as any).data ?? [];
      setPets(list);
    } catch (error) {
      console.error('Failed to load pets from API, falling back to localStorage:', error);
      // Fallback to localStorage
      if (user.role === 'owner') {
        setPets(petsStorage.getByOwner(user.id));
      } else if (ownerParam) {
        setPets(petsStorage.getByOwner(ownerParam));
      } else {
        setPets(petsStorage.getAll());
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      species: 'dog',
      breed: '',
      age: '',
      sex: 'male',
      weight: '',
      color: '',
      microchipId: '',
      allergies: '',
      medicalNotes: '',
      ownerId: user?.role === 'owner' ? user.id : '',
    });
    setEditingPet(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const petData = {
      ...formData,
      ownerId: user?.role === 'owner' ? user.id : formData.ownerId,
      age: parseInt(formData.age) || 0,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      allergies: formData.allergies.split(',').map(a => a.trim()).filter(Boolean),
    };

    if (editingPet) {
      petsStorage.update(editingPet.id, petData);
      toast({
        title: 'Pet Updated',
        description: `${formData.name}'s profile has been updated.`,
      });
    } else {
      petsStorage.create(petData);
      toast({
        title: 'Pet Added',
        description: `${formData.name} has been added successfully.`,
      });
    }

    loadPets();
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (pet: Pet) => {
    setEditingPet(pet);
    setFormData({
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      age: pet.age.toString(),
      sex: pet.sex,
      weight: pet.weight?.toString() || '',
      color: pet.color || '',
      microchipId: pet.microchipId || '',
      allergies: pet.allergies.join(', '),
      medicalNotes: pet.medicalNotes || '',
      ownerId: pet.ownerId,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (pet: Pet) => {
    if (confirm(`Are you sure you want to delete ${pet.name}?`)) {
      petsStorage.delete(pet.id);
      toast({
        title: 'Pet Deleted',
        description: `${pet.name} has been removed.`,
        variant: 'destructive',
      });
      loadPets();
    }
  };

  const owners = usersStorage.getByRole('owner');

  const filteredPets = pets.filter(pet => {
    const matchesSearch = 
      (pet.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pet.breed || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecies = speciesFilter === 'all' || pet.species === speciesFilter;
    return matchesSearch && matchesSpecies;
  });

  const { paginatedData, currentPage, totalPages, nextPage, prevPage } = usePagination(filteredPets, 10);

  const getSpeciesEmoji = (species: string) => {
    return SPECIES_OPTIONS.find(s => s.value === species)?.emoji || '🐾';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Animals</h1>
          <p className="text-muted-foreground">Manage pet profiles and information</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Pet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPet ? 'Edit Pet' : 'Add New Pet'}</DialogTitle>
              <DialogDescription>
                {editingPet ? 'Update pet information' : 'Enter the pet details below'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Pet Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="species">Species *</Label>
                    <Select
                      value={formData.species}
                      onValueChange={(value) => setFormData({ ...formData, species: value as Pet['species'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPECIES_OPTIONS.map((species) => (
                          <SelectItem key={species.value} value={species.value}>
                            {species.emoji} {species.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="breed">Breed *</Label>
                    <Input
                      id="breed"
                      value={formData.breed}
                      onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age (years) *</Label>
                    <Input
                      id="age"
                      type="number"
                      min="0"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sex">Sex *</Label>
                    <Select
                      value={formData.sex}
                      onValueChange={(value) => setFormData({ ...formData, sex: value as Pet['sex'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                  </div>
                </div>

                {user?.role !== 'owner' && (
                  <div className="space-y-2">
                    <Label htmlFor="owner">Owner *</Label>
                    <Select
                      value={formData.ownerId}
                      onValueChange={(value) => setFormData({ ...formData, ownerId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select owner" />
                      </SelectTrigger>
                      <SelectContent>
                        {owners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.name} ({owner.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="microchipId">Microchip ID</Label>
                  <Input
                    id="microchipId"
                    value={formData.microchipId}
                    onChange={(e) => setFormData({ ...formData, microchipId: e.target.value })}
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies (comma-separated)</Label>
                  <Input
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="e.g., Chicken, Seafood"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medicalNotes">Medical Notes</Label>
                  <Textarea
                    id="medicalNotes"
                    value={formData.medicalNotes}
                    onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                    placeholder="Any additional medical information..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPet ? 'Update Pet' : 'Add Pet'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or breed..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by species" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Species</SelectItem>
                {SPECIES_OPTIONS.map((species) => (
                  <SelectItem key={species.value} value={species.value}>
                    {species.emoji} {species.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pets Grid/Table */}
      {filteredPets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No pets found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || speciesFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Add your first pet to get started'}
            </p>
            {!searchTerm && speciesFilter === 'all' && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Pet
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pet</TableHead>
                  <TableHead>Species/Breed</TableHead>
                  <TableHead>Age/Sex</TableHead>
                  {user?.role !== 'owner' && <TableHead>Owner</TableHead>}
                  <TableHead>Allergies</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((pet) => {
                  const owner = usersStorage.getById(pet.ownerId);
                  return (
                    <TableRow key={pet.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg">
                            {getSpeciesEmoji(pet.species)}
                          </div>
                          <div>
                            <p className="font-medium">{pet.name}</p>
                            {pet.microchipId && (
                              <p className="text-xs text-muted-foreground">ID: {pet.microchipId}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="capitalize">{pet.species}</p>
                        <p className="text-sm text-muted-foreground">{pet.breed}</p>
                      </TableCell>
                      <TableCell>
                        <p>{pet.age} {pet.age === 1 ? 'year' : 'years'}</p>
                        <p className="text-sm text-muted-foreground capitalize">{pet.sex}</p>
                      </TableCell>
                      {user?.role !== 'owner' && (
                        <TableCell>
                          <p className="font-medium">{owner?.name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{owner?.phone}</p>
                        </TableCell>
                      )}
                      <TableCell>
                        {pet.allergies && pet.allergies.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {pet.allergies.slice(0, 2).map((allergy, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {allergy}
                              </Badge>
                            ))}
                            {pet.allergies.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{pet.allergies.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/pets/${pet.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(pet)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(pet)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {filteredPets.length > 0 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onNext={nextPage}
                onPrev={prevPage}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
