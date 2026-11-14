// @vitest-environment node

import { expect, test } from 'vitest'
import { countByCollection, decode, encode, type SpecialTypes } from './format.ts'

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

test('podsumowanie zrzutu po kolekcjach głównych', () => {
  expect(
    countByCollection(['houses/d', 'houses/d/tasks/t1', 'houses/d/tasks/t2', 'users/u']),
  ).toEqual({ houses: 3, users: 1 })
})
