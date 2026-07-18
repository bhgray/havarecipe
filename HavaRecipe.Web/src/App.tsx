import { Anchor, AppShell, Group, Title } from '@mantine/core'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { RecipeList } from './features/recipes/RecipeList'
import { ImportRecipe } from './features/import/ImportRecipe'
import { ImportWithPreview } from './features/import/ImportWithPreview'

export default function App() {
  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" gap="xl">
          <Title order={3}>HavaRecipe</Title>
          <Group gap="md">
            <Anchor component={Link} to="/recipes">
              Recipes
            </Anchor>
            <Anchor component={Link} to="/import">
              Import
            </Anchor>
            <Anchor component={Link} to="/import-preview">
              Import with Preview
            </Anchor>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<Navigate to="/recipes" replace />} />
          <Route path="/recipes" element={<RecipeList />} />
          <Route path="/import" element={<ImportRecipe />} />
          <Route path="/import-preview" element={<ImportWithPreview />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  )
}
