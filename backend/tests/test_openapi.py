"""Verify OpenAPI metadata: tags with descriptions appear in the generated schema."""


async def test_openapi_tags_descriptions_present(client):
    """The FastAPI app must expose openapi_tags so /docs is informative."""
    resp = await client.get("/openapi.json")
    assert resp.status_code == 200, resp.text
    data = resp.json()

    tag_names = [t["name"] for t in data.get("tags", [])]
    expected = ["auth", "books", "genres", "threads", "posts", "users"]
    assert tag_names == expected, f"got {tag_names}"

    # Every tag must have a non-empty description
    for tag in data["tags"]:
        assert tag.get("description"), f"tag {tag['name']!r} has no description"
