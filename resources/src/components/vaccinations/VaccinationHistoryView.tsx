import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, Heart, Search, Syringe } from 'lucide-react';
import type { Pet, User, Vaccination } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  formatVaccinationDate,
  getVaccinationDateSortValue,
  getVaccinationStatus,
  getVaccinationStatusLabel,
  getVaccinationStatusVariant,
} from '@/lib/vaccinations';

interface VaccinationHistoryViewProps {
  user: User | null;
  owners: User[];
  pets: Pet[];
  vaccinations: Vaccination[];
}

export function VaccinationHistoryView({
  user,
  owners,
  pets,
  vaccinations,
}: VaccinationHistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [viewingVaccination, setViewingVaccination] = useState<Vaccination | null>(null);

  useEffect(() => {
    if (user?.role === 'owner') {
      setSelectedOwnerId(user.id.toString());
    }
  }, [user]);

  useEffect(() => {
    if (!selectedPet) return;

    const petStillVisible = pets.some((pet) => {
      if (pet.id.toString() !== selectedPet.id.toString()) return false;
      if (!selectedOwnerId) return true;

      return pet.ownerId?.toString() === selectedOwnerId.toString();
    });

    if (!petStillVisible) {
      setSelectedPet(null);
    }
  }, [pets, selectedOwnerId, selectedPet]);

  const handleBack = () => {
    setSearchTerm('');

    if (selectedPet) {
      setSelectedPet(null);
      return;
    }

    if (selectedOwnerId && user?.role !== 'owner') {
      setSelectedOwnerId(null);
    }
  };

  const getBreadcrumbs = () => {
    const selectedOwner = user?.role === 'owner'
      ? user
      : owners.find((owner) => owner.id.toString() === selectedOwnerId?.toString());

    let trail = 'Vaccination History Directory';

    if (selectedOwnerId) {
      trail = `${trail} > ${selectedOwner?.name || 'Owner'}'s Pets`;
    }

    if (selectedPet) {
      trail = `${trail} > ${selectedPet.name}'s Vaccination History`;
    }

    return trail;
  };

  const ownerPets = selectedOwnerId
    ? pets.filter((pet) => pet.ownerId?.toString() === selectedOwnerId.toString())
    : [];
  const ownerPetIds = new Set(ownerPets.map((pet) => pet.id.toString()));
  const ownerScopeVaccinations = selectedOwnerId
    ? vaccinations.filter((vaccination) => ownerPetIds.has(vaccination.petId?.toString() || ''))
    : vaccinations;
  const selectedPetVaccinations = selectedPet
    ? ownerScopeVaccinations.filter(
        (vaccination) => vaccination.petId?.toString() === selectedPet.id.toString()
      )
    : [];

  const filteredOwners = owners.filter((owner) => {
    const normalizedSearch = searchTerm.toLowerCase();
    return (
      owner.name.toLowerCase().includes(normalizedSearch)
      || owner.email.toLowerCase().includes(normalizedSearch)
      || (owner.phone || '').includes(searchTerm)
    );
  });

  const filteredPets = ownerPets.filter((pet) => {
    const normalizedSearch = searchTerm.toLowerCase();
    return (
      pet.name.toLowerCase().includes(normalizedSearch)
      || pet.breed.toLowerCase().includes(normalizedSearch)
      || pet.species.toLowerCase().includes(normalizedSearch)
    );
  });

  const filteredRecords = selectedPetVaccinations.filter((vaccination) => {
    const normalizedSearch = searchTerm.toLowerCase();
    const clinician = vaccination.administeredByUser?.name?.toLowerCase() || '';

    return (
      vaccination.name.toLowerCase().includes(normalizedSearch)
      || (vaccination.batchNumber || '').toLowerCase().includes(normalizedSearch)
      || (vaccination.notes || '').toLowerCase().includes(normalizedSearch)
      || clinician.includes(normalizedSearch)
    );
  });

  const summaryScopeVaccinations = !selectedOwnerId
    ? vaccinations
    : selectedPet
      ? filteredRecords
      : ownerScopeVaccinations;
  const sortedSummaryVaccinations = [...summaryScopeVaccinations].sort(
    (a, b) => getVaccinationDateSortValue(b.dateAdministered) - getVaccinationDateSortValue(a.dateAdministered)
  );
  const latestVaccination = sortedSummaryVaccinations[0];
  const petsWithHistoryCount = new Set(
    sortedSummaryVaccinations
      .map((vaccination) => vaccination.petId?.toString())
      .filter(Boolean)
  ).size;

  const renderOwnersView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Owner</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Address</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredOwners.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="py-16 text-center text-muted-foreground">
              No owners found.
            </TableCell>
          </TableRow>
        ) : filteredOwners.map((owner) => (
          <TableRow key={owner.id}>
            <TableCell className="font-medium">{owner.name}</TableCell>
            <TableCell>
              <div>{owner.email}</div>
              <div className="text-sm text-muted-foreground">{owner.phone || '-'}</div>
            </TableCell>
            <TableCell>{owner.address || '-'}</TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" onClick={() => setSelectedOwnerId(owner.id.toString())}>
                View Pets
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const renderPetsView = () => (
    <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {filteredPets.length === 0 ? (
        <div className="col-span-full py-16 text-center text-muted-foreground">
          No pets found for this owner.
        </div>
      ) : filteredPets.map((pet) => {
        const petVaccinationCount = ownerScopeVaccinations.filter(
          (vaccination) => vaccination.petId?.toString() === pet.id.toString()
        ).length;

        return (
          <button
            key={pet.id}
            type="button"
            onClick={() => setSelectedPet(pet)}
            className="rounded-xl border p-4 text-left transition-colors hover:bg-muted/50"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Heart className="h-5 w-5" />
            </div>
            <div className="font-medium">{pet.name}</div>
            <div className="text-sm capitalize text-muted-foreground">
              {pet.species} | {pet.breed}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {petVaccinationCount} vaccination{petVaccinationCount === 1 ? '' : 's'} on file
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderRecordsView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Vaccine</TableHead>
          <TableHead>Next Booster</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Clinician</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredRecords.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
              No vaccination history found.
            </TableCell>
          </TableRow>
        ) : filteredRecords.map((vaccination) => {
          const status = getVaccinationStatus(vaccination);
          const clinician = vaccination.administeredByUser?.name || 'Veterinarian';

          return (
            <TableRow key={vaccination.id}>
              <TableCell>{formatVaccinationDate(vaccination.dateAdministered)}</TableCell>
              <TableCell className="font-medium">{vaccination.name}</TableCell>
              <TableCell>{formatVaccinationDate(vaccination.nextDueDate)}</TableCell>
              <TableCell>
                <Badge variant={getVaccinationStatusVariant(status)}>
                  {getVaccinationStatusLabel(status)}
                </Badge>
              </TableCell>
              <TableCell>{clinician}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => setViewingVaccination(vaccination)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const currentTitle = !selectedOwnerId
    ? 'Owner Directory'
    : !selectedPet
      ? user?.role === 'owner'
        ? 'My Pets'
        : "Owner's Pets"
      : `${selectedPet.name}'s Vaccination History`;

  const currentDescription = !selectedOwnerId
    ? 'Select an owner to view their pets'
    : !selectedPet
      ? 'Select a pet to view its vaccination history'
      : 'Review the recorded vaccination history for this pet';

  const latestVaccinationMeta = latestVaccination
    ? `${latestVaccination.pet?.name || selectedPet?.name || 'Pet'} | ${formatVaccinationDate(latestVaccination.dateAdministered)}`
    : 'No vaccination history available yet.';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            {(selectedPet || (selectedOwnerId && user?.role !== 'owner')) && (
              <Button variant="outline" size="sm" onClick={handleBack} className="h-8 shadow-sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            )}
            <Badge variant="secondary" className="bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
              {getBreadcrumbs()}
            </Badge>
          </div>
          <h2 className="text-2xl font-bold">{currentTitle}</h2>
          <p className="text-muted-foreground">{currentDescription}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={!selectedOwnerId ? 'Search owners...' : !selectedPet ? 'Search pets...' : 'Search vaccine or notes...'}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">History Records</p>
            <p className="mt-3 text-4xl font-bold tracking-tight">{sortedSummaryVaccinations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pets with History</p>
            <p className="mt-3 text-4xl font-bold tracking-tight">{petsWithHistoryCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Latest Vaccination</p>
            <p className="mt-3 text-2xl font-semibold">{latestVaccination?.name || 'No records yet'}</p>
            <p className="mt-2 text-base text-muted-foreground">{latestVaccinationMeta}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {!selectedOwnerId ? renderOwnersView() : !selectedPet ? renderPetsView() : renderRecordsView()}
        </CardContent>
      </Card>

      <Dialog open={!!viewingVaccination} onOpenChange={() => setViewingVaccination(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vaccination Details</DialogTitle>
          </DialogHeader>
          {viewingVaccination && (() => {
            const status = getVaccinationStatus(viewingVaccination);
            const clinician = viewingVaccination.administeredByUser?.name || 'Veterinarian';

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Pet</Label>
                    <p className="font-medium">{viewingVaccination.pet?.name || selectedPet?.name || 'Pet'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Vaccine</Label>
                    <p className="font-medium">{viewingVaccination.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date Administered</Label>
                    <p className="font-medium">{formatVaccinationDate(viewingVaccination.dateAdministered)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Next Booster</Label>
                    <p className="font-medium">{formatVaccinationDate(viewingVaccination.nextDueDate)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="pt-1">
                      <Badge variant={getVaccinationStatusVariant(status)}>
                        {getVaccinationStatusLabel(status)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Clinician</Label>
                    <p className="font-medium">{clinician}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Batch / Lot</Label>
                  <p>{viewingVaccination.batchNumber || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p>{viewingVaccination.notes || '-'}</p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
