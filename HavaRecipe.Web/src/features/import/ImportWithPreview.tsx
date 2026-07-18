import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Anchor,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { importRecipe } from '../../api/recipes'
import { normalizeRecipeJsonLd } from '../../api/schemaOrg'
import { JsonView } from '../../components/JsonView'
import { RecipePreview } from '../../components/RecipePreview'
import { SaveRecipe } from './SaveRecipe'

const EXAMPLE_URL = 'https://www.allrecipes.com/recipe/16354/easy-meatloaf/'
const LAST_URL_KEY = 'havarecipe:last-import-url'

export function ImportWithPreview() {
  // The imported URL lives in the query string (?url=...) rather than component state, so the
  // view survives navigation and refresh and can be shared/bookmarked. TanStack Query then
  // caches the result per URL, so coming back renders instantly instead of re-importing.
  const [searchParams, setSearchParams] = useSearchParams()
  const committedUrl = searchParams.get('url') ?? ''

  // Transient text-field state; only promoted to the query string when Import is clicked.
  const [input, setInput] = useState(committedUrl)

  // Keep the field in sync when the URL changes from outside the field (back/forward, or
  // arriving via a shared link).
  useEffect(() => setInput(committedUrl), [committedUrl])

  // The header nav links to a bare /import-preview, which would drop ?url= and reset the view.
  // Remember the last import and restore it when arriving without a param, so switching views
  // doesn't lose your work; the query cache then renders it without re-importing.
  useEffect(() => {
    if (committedUrl) {
      sessionStorage.setItem(LAST_URL_KEY, committedUrl)
      return
    }
    const last = sessionStorage.getItem(LAST_URL_KEY)
    if (last) setSearchParams({ url: last }, { replace: true })
  }, [committedUrl, setSearchParams])

  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ['import', committedUrl],
    queryFn: () => importRecipe(committedUrl),
    enabled: committedUrl.length > 0,
  })

  const normalized = useMemo(
    () => (data ? normalizeRecipeJsonLd(data.recipeJsonLd, data.suggestedName) : null),
    [data],
  )

  function handleImport() {
    const trimmed = input.trim()
    if (!trimmed) return
    if (trimmed === committedUrl) {
      // Same URL: the query key wouldn't change, so ask for an explicit refresh rather than
      // appearing to do nothing.
      void refetch()
      return
    }
    setSearchParams({ url: trimmed })
  }

  return (
    <Container>
      <Stack>
        <Title order={2}>Import with Preview</Title>

        <Group align="flex-end">
          <TextInput
            style={{ flex: 1 }}
            label="Recipe URL"
            placeholder={EXAMPLE_URL}
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && input.trim() && !isFetching) handleImport()
            }}
          />
          <Button onClick={handleImport} loading={isFetching} disabled={!input.trim()}>
            Import
          </Button>
        </Group>

        {error && (
          <Alert color="red" title="Import failed">
            {error.message}
          </Alert>
        )}

        {!committedUrl && !error && (
          <Card withBorder radius="md" padding="lg">
            <Stack gap="xs">
              <Text fw={500}>Paste a recipe URL and click Import.</Text>
              <Text c="dimmed" size="sm">
                The page is fetched server-side, its schema.org Recipe structured data is extracted, and
                a preview of what would be imported is shown below — nothing is saved. Pages behind a
                login can't be imported from the web app (that's coming to the mobile app).
              </Text>
              <Text size="sm">
                Try an example:{' '}
                <Anchor component="button" type="button" onClick={() => setInput(EXAMPLE_URL)}>
                  Easy Meatloaf
                </Anchor>
              </Text>
            </Stack>
          </Card>
        )}

        {data && <SaveRecipe imported={data} />}

        {data && normalized && (
          <Tabs defaultValue="preview">
            <Tabs.List>
              <Tabs.Tab value="preview">Preview</Tabs.Tab>
              <Tabs.Tab value="raw">Raw JSON</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="preview" pt="md">
              <RecipePreview recipe={normalized} />
            </Tabs.Panel>
            <Tabs.Panel value="raw" pt="md">
              <JsonView data={data} />
            </Tabs.Panel>
          </Tabs>
        )}
      </Stack>
    </Container>
  )
}
