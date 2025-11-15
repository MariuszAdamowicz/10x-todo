import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const ProjectListSkeleton = () => {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: 6 }).map((_, index) => (
				<Card key={index}>
					<CardHeader>
						<Skeleton className="h-6 w-3/4" />
						<Skeleton className="h-4 w-1/2 mt-2" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6 mt-2" />
					</CardContent>
				</Card>
			))}
		</div>
	);
};

export default ProjectListSkeleton;