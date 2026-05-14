import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
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
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Users,
  Eye,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function OwnersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ownerIdParam = searchParams.get('id');

  const [owners, setOwners] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadOwners();
  }, [user]);

  const loadOwners = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // api.getOwners() hits /api/owners which applies server-side role-based filtering:
      // - admin → all owners
      // - vet_clinic → only owners who have an appointment with this clinic's vets
      // Each owner object already includes a `pets` array (eager-loaded by backend)
      const data = await api.getOwners();
      setOwners(Array.isArray(data) ? data : (data as any).data ?? []);
    } catch (error) {
      console.error('Failed to load owners from API:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOwners = owners.filter((owner) => {
    const matchesId = ownerIdParam ? String(owner.id) === ownerIdParam : true;
    const matchesSearch = 
      owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (owner.phone && owner.phone.includes(searchTerm));
    return matchesId && matchesSearch;
  });

  const { paginatedData, currentPage, totalPages, nextPage, prevPage } =
    usePagination(filteredOwners, 10);

  return (
    <div className="space-y-6 animate-fade-in" data-tour="owners-page">
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
          {isLoading ? (
            <div className="py-16 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Loading owners...</p>
            </div>
          ) : filteredOwners.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No owners found</h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? 'Try adjusting your search'
                  : 'No pet owners with appointments at your clinic yet'}
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
                  {paginatedData.map((owner) => {
                    // The backend eager-loads pets[] on each owner
                    const petsArr = (owner as any).pets;
                    const petCount = Array.isArray(petsArr) ? petsArr.length : 0;
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
              {filteredOwners.length > 0 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onNext={nextPage}
                  onPrev={prevPage}
                  className="mt-4"
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
