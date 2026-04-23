import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usersStorage, petsStorage, appointmentsStorage, veterinariansStorage } from '@/lib/storage';
import type { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { 
  Search,  
  Users,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OwnersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [owners, setOwners] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    loadOwners();
  }, [user]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const loadOwners = () => {
    if (!user) return;
    
    // Admin sees everyone
    if (user.role === 'admin') {
      setOwners(usersStorage.getByRole('owner'));
      return;
    }

    // Vet Clinics only see owners who have booked appointments with their clinic
    if (user.role === 'vet_clinic') {
      const clinicVets = veterinariansStorage.getByClinic(user.id).map(v => v.id);
      const relevantOwnerIds = new Set<string>();
      
      appointmentsStorage.getAll().forEach(a => {
        if (clinicVets.includes(a.veterinarianId)) {
          relevantOwnerIds.add(a.ownerId);
        }
      });
      
      const filteredOwners = usersStorage.getAll().filter(u => relevantOwnerIds.has(u.id));
      setOwners(filteredOwners);
      return;
    }

    // Veterinarians only see owners who booked specifically with them
    if (user.role === 'veterinarian' as any) {
      const relevantOwnerIds = new Set<string>();
      appointmentsStorage.getByVet(user.id).forEach(a => relevantOwnerIds.add(a.ownerId));
      setOwners(usersStorage.getAll().filter(u => relevantOwnerIds.has(u.id)));
      return;
    }
    
    setOwners([]);
  };

  const filteredOwners = owners.filter(owner => {
    return (
      owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (owner.phone && owner.phone.includes(searchTerm))
    );
  });

  const totalOwners = filteredOwners.length;
  const totalPages = Math.max(1, Math.ceil(totalOwners / PAGE_SIZE));
  const ownersToShow = filteredOwners.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pet Owners</h1>
          <p className="text-muted-foreground">View and manage pet owner profiles</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Owners Table */}
      <Card>
        <CardContent className="p-0">
          {filteredOwners.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No owners found</h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Try adjusting your search' 
                  : 'No pet owners registered yet'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Pets</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownersToShow.map((owner) => {
                    const petCount = petsStorage.getByOwner(owner.id).length;
                    return (
                      <TableRow key={owner.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                              {owner.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{owner.name}</p>
                              <p className="text-sm text-muted-foreground">{owner.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p>{owner.phone || '-'}</p>
                        </TableCell>
                        <TableCell>
                          <p className="max-w-48 truncate">{owner.address || '-'}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {petCount} {petCount === 1 ? 'pet' : 'pets'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/pets?owner=' + owner.id)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Pets
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={(e) => {
                          e.preventDefault();
                          setPage((prev) => Math.max(prev - 1, 1));
                        }}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, index) => (
                      <PaginationItem key={index}>
                        <PaginationLink
                          href="#"
                          isActive={page === index + 1}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(index + 1);
                          }}
                        >
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={(e) => {
                          e.preventDefault();
                          setPage((prev) => Math.min(prev + 1, totalPages));
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
