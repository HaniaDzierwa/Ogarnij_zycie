// @vitest-environment node

import { expect, test } from 'vitest'
import { countByCollection, decode, encode, fromRestFields, type SpecialTypes } from './format.ts'

class Ts {
  constructor(
    public seconds: number,
    public nanoseconds: number,
  ) {}
}
class Geo {
  constructor(
    public latitude: number,
    public longitude: number,
  ) {}
}
class Ref {
  constructor(public path: string) {}
}

const types: SpecialTypes = {
  isTimestamp: (v): v is Ts => v instanceof Ts,
  isGeoPoint: (v): v is Geo => v instanceof Geo,
  isReference: (v): v is Ref => v instanceof Ref,
  timestamp: (s, ns) => new Ts(s, ns),
  geoPoint: (lat, lng) => new Geo(lat, lng),
  reference: (p) => new Ref(p),
}

test('zadanie z datami, listami i zagnieżdżeniem wraca takie samo', () => {
  const task = {
    title: 'Kupić mleko',
    done: false,
    due: null,
    order: 3.5,
    createdAt: new Ts(1762000000, 123000000),
    steps: [{ text: 'Sklep', done: true, at: new Ts(1762000100, 0) }],
    scope: { all: true, categoryIds: ['a', 'b'] },
    place: new Geo(52.23, 21.01),
    house: new Ref('houses/dom1'),
    blob: new Uint8Array([1, 2, 255]),
  }
  const json = JSON.parse(JSON.stringify(encode(task, types)))
  expect(json.createdAt).toEqual({ __typ: 'czas', s: 1762000000, ns: 123000000 })
  expect(decode(json, types)).toEqual(task)
})

test('zrzut przez REST API daje ten sam format co przez klucz', () => {
  const rest = fromRestFields({
    title: { stringValue: 'Kupić mleko' },
    done: { booleanValue: false },
    due: { nullValue: null },
    order: { doubleValue: 3.5 },
    count: { integerValue: '7' },
    createdAt: { timestampValue: '2025-11-01T12:26:40.123Z' },
    steps: {
      arrayValue: {
        values: [
          {
            mapValue: {
              fields: {
                text: { stringValue: 'Sklep' },
                at: { timestampValue: '2025-11-01T12:28:20Z' },
              },
            },
          },
        ],
      },
    },
    empty: { arrayValue: {} },
    house: { referenceValue: 'projects/p/databases/(default)/documents/houses/dom1' },
    place: { geoPointValue: { latitude: 52.23, longitude: 21.01 } },
    blob: { bytesValue: 'AQL/' },
  })
  expect(decode(rest, types)).toEqual({
    title: 'Kupić mleko',
    done: false,
    due: null,
    order: 3.5,
    count: 7,
    createdAt: new Ts(1762000000, 123000000),
    steps: [{ text: 'Sklep', at: new Ts(1762000100, 0) }],
    empty: [],
    house: new Ref('houses/dom1'),
    place: new Geo(52.23, 21.01),
    blob: new Uint8Array([1, 2, 255]),
  })
})

test('podsumowanie zrzutu po kolekcjach głównych', () => {
  expect(
    countByCollection(['houses/d', 'houses/d/tasks/t1', 'houses/d/tasks/t2', 'users/u']),
  ).toEqual({ houses: 3, users: 1 })
})
