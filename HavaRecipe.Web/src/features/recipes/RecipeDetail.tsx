import { useMemo } from 'react'
import { Alert, Anchor, Container, Loader, Stack, Tabs, Text } from '@mantine/core'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getRecipe } from '../../api/recipes'
import { ApiError } from '../../api/client'
import { normalizeRecipeJsonLd } from '../../api/schemaOrg'
import { JsonView } from '../../components/JsonView'
import { RecipePreview } from '../../components/RecipePreview'

export function RecipeDetail() {
  const { slug = '' } = useParams()

  const { data, error, isPending } = useQuery({
    queryKey: ['recipe', slug],
    queryFn: () => getRecipe(slug),
    enabled: slug.length > 0,
  })

  const normalized = useMemo(
    () => (data ? normalizeRecipeJsonLd(data.recipeJsonLd, data.name) : null),
    [data],
  )

  const notFound = error instanceof ApiError && error.status === 404

  return (
    <Container>
      <Stack>
        <Anchor component={Link} to="/recipes" size="sm">
          ← Back to recipes
        </Anchor>

        {isPending && <Loader />}

        {error && (
          <Alert
            color={notFound ? 'yellow' : 'red'}
            title={notFound ? 'Recipe not found' : 'Failed to load recipe'}
          >
            {notFound ? `No recipe is saved with the slug '${slug}'.` : error.message}
          </Alert>
        )}

        {data && normalized && (
          <>
            <Text size="sm" c="dimmed">
              {data.slug} · saved {new Date(data.createdAt).toLocaleString()}
            </Text>

            <Tabs defaultValue="preview">
              <Tabs.List>
                <Tabs.Tab value="preview">Preview</Tabs.Tab>
                <Tabs.Tab value="raw">Raw JSON</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="preview" pt="md">
                <RecipePreview recipe={normalized} />
              </Tabs.Panel>
              <Tabs.Panel value="raw" pt="md">
                <JsonView data={data.recipeJsonLd} />
              </Tabs.Panel>
            </Tabs>
          </>
        )}
      </Stack>
    </Container>
  )
}
