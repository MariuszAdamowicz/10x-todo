import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const EmptyState = () => {
	return (
		<Card className="text-center">
			<CardHeader>
				<CardTitle>Brak projektów</CardTitle>
				<CardDescription>
					Wygląda na to, że nie masz jeszcze żadnych projektów. Stwórz swój pierwszy projekt, aby
					rozpocząć!
				</CardDescription>
			</CardHeader>
			<CardContent>
				{/* Można tu dodać ikonę lub ilustrację */}
				<p className="text-6xl" role="img" aria-label="No projects icon">
					✨
				</p>
			</CardContent>
		</Card>
	);
};

export default EmptyState;