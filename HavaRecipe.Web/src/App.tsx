import { Anchor, AppShell, Group, Title } from '@mantine/core'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { RecipeList } from './features/recipes/RecipeList'
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
            <Anchor component={Link} to="/import-preview">
              Import
            </Anchor>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<Navigate to="/recipes" replace />} />
          <Route path="/recipes" element={<RecipeList />} />
          {/* The old raw-JSON import view was retired; its output is the "Raw JSON" tab of
              the preview view. Redirect so existing links don't hit a blank page. */}
          <Route path="/import" element={<Navigate to="/import-preview" replace />} />
          <Route path="/import-preview" element={<ImportWithPreview />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  )
}
